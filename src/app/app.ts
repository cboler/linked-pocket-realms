import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ArchetypeClass,
  AtmospherePrefix,
  BiomeNoun,
  CoreLegendType,
  DeclarativeTrigger,
  DrawerTab,
  EquipmentItem,
  ExitDirection,
  GuestbookGravestoneEntry,
  HeatmapMode,
  PaperdollSlotType,
  PerspectiveRole,
  RoomNode,
  ServerEraLetter,
  SkillSlot,
  StatusTag,
  StructuralTheme,
  TerminalFeedLine,
} from './core/models/domain.models';
import {
  ATMOSPHERE_PREFIXES,
  BIOME_NOUNS,
  ChaosGateService,
  STRUCTURAL_THEMES,
} from './core/services/chaos-gate.service';
import { LegendRegistryService } from './core/services/legend-registry.service';
import { MudEngineService } from './core/services/mud-engine.service';
import { StorageService } from './core/services/storage.service';
import { TransportService } from './core/services/transport.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly engine = inject(MudEngineService);
  readonly legendRegistry = inject(LegendRegistryService);
  readonly transport = inject(TransportService);
  readonly storage = inject(StorageService);
  readonly chaosGate = inject(ChaosGateService);

  // Constants exposed for templates
  readonly serverEras: ServerEraLetter[] = ['Δ', 'Θ', 'Λ', 'Σ', 'Ω'];
  readonly atmospheres: AtmospherePrefix[] = ATMOSPHERE_PREFIXES;
  readonly themes: StructuralTheme[] = STRUCTURAL_THEMES;
  readonly biomes: BiomeNoun[] = BIOME_NOUNS;
  readonly archetypes: ArchetypeClass[] = ['Vanguard', 'Chronomancer', 'Hexblade', 'Artificer'];
  readonly paperdollSlots: PaperdollSlotType[] = [
    'Head',
    'Chest',
    'Legs',
    'Main-Hand',
    'Off-Hand',
    'Relic 1',
    'Relic 2',
  ];
  readonly directions: ExitDirection[] = ['N', 'S', 'E', 'W', 'U', 'D'];
  readonly trackedStatusTags: StatusTag[] = ['Burn', 'Chill', 'Sunder', 'Overcharge'];
  readonly heatmapModes: HeatmapMode[] = ['LETHALITY', 'TRAFFIC', 'TIME_SPENT', 'LOOT'];

  // Terminal Input
  readonly terminalCommandText = signal<string>('');

  // Chaos Gate Dialer Controls
  readonly dialEra = signal<ServerEraLetter>('Θ');
  readonly dialAtmosphere = signal<AtmospherePrefix>('Scorching');
  readonly dialTheme = signal<StructuralTheme>('Clockwork');
  readonly dialBiome = signal<BiomeNoun>('Catacombs');

  // Architect Visual Editor Form Signals
  readonly editRoomTitle = signal<string>('');
  readonly editRoomDesc = signal<string>('');
  readonly editRoomLegend = signal<CoreLegendType>('corridor');
  readonly digDirection = signal<ExitDirection>('E');
  readonly digTitle = signal<string>('Astral Relay Vault');
  readonly triggerWhen = signal<DeclarativeTrigger['when']>('ON_ENTER');
  readonly triggerIf = signal<string>('PER >= 12');
  readonly triggerDo = signal<DeclarativeTrigger['doAction']>('EMIT_LORE');
  readonly triggerPayload = signal<string>('Hidden memory crystal resonates!');
  readonly customLegendGlyph = signal<string>('✦');
  readonly customLegendLabel = signal<string>('Aether Conduit');
  readonly customLegendColor = signal<string>('#f472b6');

  // Paperdoll & Inventory Filtering
  readonly inventoryFilter = signal<string>('ALL');
  readonly hoveredInventoryItem = signal<EquipmentItem | null>(null);

  // Bestiary & Compendium Search
  readonly chronicleSearch = signal<string>('');

  // P2P & Cartridge Import/Export
  readonly exportedCartridgeText = signal<string>('');
  readonly remoteHandshakeInput = signal<string>('');

  // Computed Map Edges & Fog-of-War Nodes
  readonly visibleCartographyNodes = computed<
    {
      room: RoomNode;
      visited: boolean;
      adjacentRumor: boolean;
      glyph: string;
      colorHex: string;
      heatmapColor: string;
      visitorNames: string[];
    }[]
  >(() => {
    const allRooms = this.engine.rooms();
    const char = this.engine.character();
    const visitedSet = new Set(char.visitedRoomIds);
    const role = this.engine.perspective();
    const visitors = this.transport.activeVisitorsList();
    const metrics = this.engine.telemetry().roomMetrics;
    const heatMode = this.engine.heatmapMode();

    // Find rooms adjacent to visited rooms
    const adjacentSet = new Set<string>();
    for (const r of allRooms) {
      if (visitedSet.has(r.id)) {
        for (const ex of r.exits) {
          if (!ex.isSecret || this.engine.effectiveAttributes().PER >= 12 || role === 'ARCHITECT') {
            adjacentSet.add(ex.targetRoomId);
          }
        }
      }
    }

    return allRooms
      .filter((r) => {
        if (role === 'ARCHITECT' || role === 'SPECTATOR') return true;
        return visitedSet.has(r.id) || adjacentSet.has(r.id);
      })
      .map((r) => {
        const visited = visitedSet.has(r.id);
        const adjacentRumor = !visited && adjacentSet.has(r.id);
        const leg = this.legendRegistry.resolveEntry(r.legendType, r.customLegendId);
        const roomVisitors = visitors
          .filter((v) => v.currentRoomId === r.id)
          .map((v) => v.playerName);
        const m = metrics[r.id];
        let heatVal = 0;
        if (m) {
          if (heatMode === 'LETHALITY') heatVal = Math.min(1, m.playerDeaths / 4);
          else if (heatMode === 'TRAFFIC') heatVal = Math.min(1, m.visitorCount / 15);
          else if (heatMode === 'TIME_SPENT') heatVal = Math.min(1, m.totalTimeSpentMs / 120000);
          else if (heatMode === 'LOOT') heatVal = Math.min(1, m.lootExtractedCount / 6);
        }
        const heatmapColor = this.interpolateHeatColor(heatVal);

        return {
          room: r,
          visited,
          adjacentRumor,
          glyph: visited || role !== 'EXPLORER' ? leg.glyph : '?',
          colorHex: visited || role !== 'EXPLORER' ? leg.colorHex : '#64748b',
          heatmapColor,
          visitorNames: roomVisitors,
        };
      });
  });

  readonly cartographyEdges = computed<
    {
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isSecret: boolean;
      isLocked: boolean;
    }[]
  >(() => {
    const visibleNodes = this.visibleCartographyNodes();
    const nodeMap = new Map(visibleNodes.map((n) => [n.room.id, n.room]));
    const edges: {
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isSecret: boolean;
      isLocked: boolean;
    }[] = [];
    const seen = new Set<string>();
    const role = this.engine.perspective();
    const per = this.engine.effectiveAttributes().PER;

    for (const n of visibleNodes) {
      for (const ex of n.room.exits) {
        if (ex.isSecret && role === 'EXPLORER' && per < 12) continue;
        const target = nodeMap.get(ex.targetRoomId);
        if (!target) continue;
        const pairKey = [n.room.id, target.id].sort().join('--');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        edges.push({
          id: pairKey,
          x1: n.room.x,
          y1: n.room.y,
          x2: target.x,
          y2: target.y,
          isSecret: !!ex.isSecret,
          isLocked: !!ex.isLocked,
        });
      }
    }
    return edges;
  });

  // Attribute Radar Chart SVG Polygon Points (5 axes: STR, DEX, INT, PER, VIT)
  readonly radarPolygonPoints = computed<string>(() => {
    const attr = this.engine.effectiveAttributes();
    const values = [attr.STR, attr.DEX, attr.INT, attr.PER, attr.VIT];
    const maxVal = 28;
    const cx = 110;
    const cy = 110;
    const radius = 78;

    return values
      .map((val, idx) => {
        const ratio = Math.min(1, Math.max(0.15, val / maxVal));
        const angle = (idx / 5) * Math.PI * 2 - Math.PI / 2;
        const x = (cx + Math.cos(angle) * radius * ratio).toFixed(1);
        const y = (cy + Math.sin(angle) * radius * ratio).toFixed(1);
        return `${x},${y}`;
      })
      .join(' ');
  });

  readonly radarAxisLabels = computed<{ label: string; value: number; x: number; y: number }[]>(
    () => {
      const attr = this.engine.effectiveAttributes();
      const entries: [string, number][] = [
        ['STR', attr.STR],
        ['DEX', attr.DEX],
        ['INT', attr.INT],
        ['PER', attr.PER],
        ['VIT', attr.VIT],
      ];
      const cx = 110;
      const cy = 110;
      const labelRadius = 96;
      return entries.map(([label, value], idx) => {
        const angle = (idx / 5) * Math.PI * 2 - Math.PI / 2;
        return {
          label,
          value,
          x: Math.round(cx + Math.cos(angle) * labelRadius),
          y: Math.round(cy + Math.sin(angle) * labelRadius),
        };
      });
    },
  );

  // Combat Telemetry Breakdown (DPS, Mitigation, Overkill per Skill)
  readonly skillTelemetryBreakdown = computed<
    {
      skillName: string;
      element: string;
      damageDealt: number;
      damageMitigated: number;
      overkill: number;
      healingDone: number;
      totalWidthPct: number;
    }[]
  >(() => {
    const samples = this.engine.telemetry().combatSamples;
    const map = new Map<
      string,
      {
        skillName: string;
        element: string;
        damageDealt: number;
        damageMitigated: number;
        overkill: number;
        healingDone: number;
      }
    >();

    for (const s of samples) {
      const existing = map.get(s.skillName) ?? {
        skillName: s.skillName,
        element: s.element,
        damageDealt: 0,
        damageMitigated: 0,
        overkill: 0,
        healingDone: 0,
      };
      existing.damageDealt += s.damageDealt;
      existing.damageMitigated += s.damageMitigated;
      existing.overkill += s.overkill;
      existing.healingDone += s.healingDone;
      map.set(s.skillName, existing);
    }

    const rows = Array.from(map.values());
    const maxTotal = Math.max(
      1,
      ...rows.map((r) => r.damageDealt + r.damageMitigated + r.overkill + r.healingDone),
    );

    return rows.map((r) => ({
      ...r,
      totalWidthPct: Math.round(
        ((r.damageDealt + r.damageMitigated + r.overkill + r.healingDone) / maxTotal) * 100,
      ),
    }));
  });

  // Roll Distribution Histogram (5 buckets: 1-20, 21-40, 41-60, 61-80, 81-100)
  readonly rollHistogramBuckets = computed<
    { label: string; count: number; heightPct: number; critCount: number }[]
  >(() => {
    const samples = this.engine.telemetry().combatSamples;
    const buckets = [
      { label: '01-20', count: 0, critCount: 0 },
      { label: '21-40', count: 0, critCount: 0 },
      { label: '41-60', count: 0, critCount: 0 },
      { label: '61-80', count: 0, critCount: 0 },
      { label: '81-100', count: 0, critCount: 0 },
    ];
    for (const s of samples) {
      const idx = Math.min(4, Math.max(0, Math.floor((s.rollValue - 1) / 20)));
      buckets[idx].count++;
      if (s.outcome === 'CRIT') buckets[idx].critCount++;
    }
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({
      ...b,
      heightPct: Math.round((b.count / maxCount) * 100),
    }));
  });

  // Career Wealth / XP Progression SVG Polyline Points
  readonly careerProgressionPolyline = computed<{ xpPoints: string; goldPoints: string }>(() => {
    const list = this.engine.telemetry().careerChronicle;
    if (list.length === 0) return { xpPoints: '10,90 290,90', goldPoints: '10,90 290,90' };
    const maxVal = Math.max(100, ...list.map((c) => Math.max(c.cumulativeXp, c.cumulativeGold)));
    const w = 280;
    const h = 80;
    const xpPoints = list
      .map((entry, idx) => {
        const x = 10 + (list.length === 1 ? w / 2 : (idx / (list.length - 1)) * w);
        const y = 90 - (entry.cumulativeXp / maxVal) * h;
        return `${Math.round(x)},${Math.round(y)}`;
      })
      .join(' ');
    const goldPoints = list
      .map((entry, idx) => {
        const x = 10 + (list.length === 1 ? w / 2 : (idx / (list.length - 1)) * w);
        const y = 90 - (entry.cumulativeGold / maxVal) * h;
        return `${Math.round(x)},${Math.round(y)}`;
      })
      .join(' ');
    return { xpPoints, goldPoints };
  });

  readonly filteredInventory = computed<EquipmentItem[]>(() => {
    const inv = this.engine.character().inventory;
    const f = this.inventoryFilter();
    if (f === 'ALL') return inv;
    return inv.filter((i) => i.slot === f || i.provenance === f);
  });

  readonly filteredChronicleEntries = computed(() => {
    const q = this.chronicleSearch().trim().toLowerCase();
    const list = this.engine.telemetry().careerChronicle;
    if (!q) return list;
    return list.filter(
      (c) => c.gateAddress.toLowerCase().includes(q) || c.eventTitle.toLowerCase().includes(q),
    );
  });

  constructor() {
    this.syncArchitectEditorWithSelectedRoom();
  }

  setPerspective(role: PerspectiveRole): void {
    this.engine.perspective.set(role);
    if (role === 'ARCHITECT') {
      this.syncArchitectEditorWithSelectedRoom();
    } else if (role === 'SPECTATOR' && !this.engine.activeReplayEntry()) {
      const firstGuest = this.engine.telemetry().guestbook[0] ?? null;
      this.engine.activeReplayEntry.set(firstGuest);
      this.engine.replayCursorIndex.set(0);
    }
  }

  toggleDrawer(tab: DrawerTab): void {
    if (this.engine.activeDrawer() === tab) {
      this.engine.activeDrawer.set('NONE');
    } else {
      this.engine.activeDrawer.set(tab);
      if (tab === 'NETWORK') {
        this.exportedCartridgeText.set(
          this.storage.exportCartridgeBase64(this.engine.activeRealmDelta()),
        );
      }
    }
  }

  submitTerminalCommand(): void {
    const cmd = this.terminalCommandText();
    if (!cmd.trim()) return;
    this.engine.parseAndDispatchTerminalInput(cmd);
    this.terminalCommandText.set('');
  }

  onBadgeClick(badge: NonNullable<TerminalFeedLine['badges']>[number]): void {
    if (badge.actionType === 'ATTACK') {
      this.engine.selectedTargetId.set(badge.targetId);
      this.engine.dispatchCommandIntent({
        type: 'ATTACK',
        rawInput: `attack ${badge.targetId}`,
        source: 'HUD',
        targetId: badge.targetId,
      });
    } else if (badge.actionType === 'INSPECT') {
      this.engine.dispatchCommandIntent({
        type: 'INSPECT',
        rawInput: `inspect ${badge.targetId}`,
        source: 'HUD',
        targetId: badge.targetId,
      });
    } else if (badge.actionType === 'TAKE_ITEM') {
      this.engine.dispatchCommandIntent({
        type: 'TAKE_ITEM',
        rawInput: `take ${badge.targetId}`,
        source: 'HUD',
        targetId: badge.targetId,
      });
    } else if (badge.actionType === 'ENTER_PORTAL') {
      this.engine.dispatchCommandIntent({
        type: 'ENTER_PORTAL',
        rawInput: `portal ${badge.targetId}`,
        source: 'HUD',
        targetId: badge.targetId,
      });
    }
  }

  onSkillButtonClick(skill: SkillSlot): void {
    const targetId = this.engine.selectedTargetId() ?? this.engine.livingRoomMonsters()[0]?.id;
    this.engine.dispatchCommandIntent({
      type: 'CAST_SKILL',
      rawInput: `cast ${skill.commandKey}`,
      source: 'HUD',
      skillKey: skill.commandKey,
      targetId,
    });
  }

  onDirectionClick(dir: ExitDirection): void {
    this.engine.dispatchCommandIntent({
      type: 'MOVE',
      rawInput: dir.toLowerCase(),
      source: 'HUD',
      direction: dir,
    });
  }

  hasExitInDirection(dir: ExitDirection): boolean {
    const room = this.engine.currentRoom();
    if (!room) return false;
    const per = this.engine.effectiveAttributes().PER;
    return room.exits.some((e) => e.direction === dir && (!e.isSecret || per >= 12));
  }

  onNodeClick(room: RoomNode): void {
    if (this.engine.perspective() === 'ARCHITECT') {
      this.engine.selectedArchitectRoomId.set(room.id);
      this.syncArchitectEditorWithSelectedRoom();
      return;
    }
    const curRoom = this.engine.currentRoom();
    const exit = curRoom.exits.find((e) => e.targetRoomId === room.id);
    if (exit) {
      this.onDirectionClick(exit.direction);
    } else if (this.engine.character().visitedRoomIds.includes(room.id)) {
      this.engine.moveToRoom(room.id);
    }
  }

  syncArchitectEditorWithSelectedRoom(): void {
    const roomId = this.engine.selectedArchitectRoomId();
    const room = this.engine.rooms().find((r) => r.id === roomId) ?? this.engine.currentRoom();
    if (!room) return;
    this.editRoomTitle.set(room.title);
    this.editRoomDesc.set(room.description);
    this.editRoomLegend.set(room.legendType);
  }

  saveArchitectRoomChanges(): void {
    const roomId = this.engine.selectedArchitectRoomId();
    this.engine.dispatchCommandIntent({
      type: 'MOO_DESCRIBE',
      rawInput: `@describe ${this.editRoomDesc()}`,
      source: 'HUD',
      payload: {
        roomId,
        title: this.editRoomTitle(),
        description: this.editRoomDesc(),
        legendType: this.editRoomLegend(),
      },
    });
  }

  architectDigNewRoom(): void {
    this.engine.dispatchCommandIntent({
      type: 'MOO_DIG',
      rawInput: `@dig ${this.digDirection()} ${this.digTitle()}`,
      source: 'HUD',
      payload: {
        direction: this.digDirection(),
        title: this.digTitle(),
      },
    });
    this.syncArchitectEditorWithSelectedRoom();
  }

  architectAddTrigger(): void {
    this.engine.dispatchCommandIntent({
      type: 'MOO_TRIGGER',
      rawInput: `@trigger ${this.triggerWhen()} ${this.triggerIf()} ${this.triggerDo()} ${this.triggerPayload()}`,
      source: 'HUD',
      payload: {
        roomId: this.engine.selectedArchitectRoomId(),
        when: this.triggerWhen(),
        ifCondition: this.triggerIf(),
        doAction: this.triggerDo(),
        actionPayload: this.triggerPayload(),
      },
    });
  }

  architectRegisterCustomLegend(): void {
    this.engine.dispatchCommandIntent({
      type: 'MOO_LEGEND',
      rawInput: `@legend ${this.customLegendGlyph()} ${this.customLegendColor()} ${this.customLegendLabel()}`,
      source: 'HUD',
      payload: {
        glyph: this.customLegendGlyph(),
        colorHex: this.customLegendColor(),
        label: this.customLegendLabel(),
      },
    });
  }

  dialSelectedChaosGate(asGuest: boolean): void {
    this.engine.dialChaosGate(
      this.dialEra(),
      this.dialAtmosphere(),
      this.dialTheme(),
      this.dialBiome(),
      asGuest,
    );
  }

  selectReplayGuestbook(entry: GuestbookGravestoneEntry): void {
    this.engine.activeReplayEntry.set(entry);
    this.engine.replayCursorIndex.set(0);
    this.engine.perspective.set('SPECTATOR');
  }

  computeStatComparisonTooltip(item: EquipmentItem): string {
    const equipped = this.engine.character().paperdoll[item.slot];
    const itemAtk = item.statBonuses.atkBonus ?? 0;
    const eqAtk = equipped?.statBonuses.atkBonus ?? 0;
    const diffAtk = itemAtk - eqAtk;

    const itemSpd = item.statBonuses.speedPctBonus ?? 0;
    const eqSpd = equipped?.statBonuses.speedPctBonus ?? 0;
    const diffSpd = itemSpd - eqSpd;

    const atkSign = diffAtk >= 0 ? `+${diffAtk}` : `${diffAtk}`;
    const spdSign = diffSpd >= 0 ? `+${diffSpd}%` : `${diffSpd}%`;
    return `${atkSign} ATK / ${spdSign} Speed vs. equipped`;
  }

  async generateWebRtcOffer(): Promise<void> {
    await this.transport.createWebRtcOffer();
  }

  async acceptWebRtcHandshake(): Promise<void> {
    const token = this.remoteHandshakeInput();
    if (!token.trim()) return;
    await this.transport.acceptWebRtcHandshake(token);
  }

  importRealmCartridge(): void {
    const raw = this.exportedCartridgeText().trim();
    if (!raw) return;
    const delta = this.storage.importCartridgeBase64(raw);
    if (!delta) return;
    this.engine.dialChaosGate(
      delta.gateAddress.era,
      delta.gateAddress.atmosphere,
      delta.gateAddress.theme,
      delta.gateAddress.biome,
      true,
      delta,
    );
  }

  private interpolateHeatColor(ratio: number): string {
    if (ratio <= 0.05) return '#1e293b';
    if (ratio < 0.4) return '#0284c7';
    if (ratio < 0.7) return '#f59e0b';
    return '#ef4444';
  }
}

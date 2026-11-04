import { Component, HostListener, computed, inject, signal } from '@angular/core';
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
  MonsterBodyPart,
  MonsterEntity,
  PaperdollSlotType,
  PerspectiveRole,
  RoomNode,
  ServerEraLetter,
  SkillSlot,
  StatusTag,
  StructuralTheme,
  TerminalFeedLine,
  HERALD_ADJECTIVES,
  HERALD_NOUNS,
  HERALD_TEMPLATES,
  HERALD_VERBS,
  formatHeraldGreeting,
  rollRandomHeraldGreeting,
} from './core/models/domain.models';
import {
  ATMOSPHERE_PREFIXES,
  BIOME_NOUNS,
  ChaosGateService,
  SERVER_ERAS,
  STRUCTURAL_THEMES,
} from './core/services/chaos-gate.service';
import { LegendRegistryService } from './core/services/legend-registry.service';
import { ARCHETYPE_CATALOG, MudEngineService } from './core/services/mud-engine.service';
import { SoundFxService } from './core/services/sound-fx.service';
import { StorageService } from './core/services/storage.service';
import { TransportService } from './core/services/transport.service';
import { ThunderpassService } from './core/services/thunderpass.service';
import { generateQrMatrix, generateQrSvgPath } from './core/utils/qr-code.util';
import { FirstPersonStageComponent } from './viewport/first-person-stage';
import { NodeMapGraphComponent } from './hud/node-map-graph/node-map-graph';
import { ResonanceLoomModalComponent } from './hud/resonance-loom-modal/resonance-loom-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FirstPersonStageComponent,
    NodeMapGraphComponent,
    ResonanceLoomModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly engine = inject(MudEngineService);
  readonly legendRegistry = inject(LegendRegistryService);
  readonly transport = inject(TransportService);
  readonly storage = inject(StorageService);
  readonly chaosGate = inject(ChaosGateService);
  readonly thunderpass = inject(ThunderpassService);
  readonly soundFx = inject(SoundFxService);

  readonly isWritingInscription = signal<boolean>(false);
  readonly inscriptionDraft = signal<string>('');

  // Constants exposed for templates
  readonly archetypeCatalog = ARCHETYPE_CATALOG;
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
  readonly armorSlots: PaperdollSlotType[] = ['Head', 'Chest', 'Legs'];
  readonly armamentSlots: PaperdollSlotType[] = ['Main-Hand', 'Off-Hand', 'Relic 1', 'Relic 2'];
  readonly directions: ExitDirection[] = ['N', 'S', 'E', 'W', 'U', 'D'];
  readonly cardinalDirections: ExitDirection[] = ['N', 'S', 'E', 'W'];
  readonly trackedStatusTags: StatusTag[] = ['Burn', 'Chill', 'Sunder', 'Overcharge'];
  readonly heatmapModes: HeatmapMode[] = ['LETHALITY', 'TRAFFIC', 'TIME_SPENT', 'LOOT'];
  readonly Math = Math;

  // Approved Herald Greeting Catalog
  readonly heraldTemplates = HERALD_TEMPLATES;
  readonly heraldAdjectives = HERALD_ADJECTIVES;
  readonly heraldNouns = HERALD_NOUNS;
  readonly heraldVerbs = HERALD_VERBS;

  // Herald Motto Composer State
  readonly heraldTemplateId = signal<number>(0);
  readonly heraldAdjective = signal<string>(HERALD_ADJECTIVES[0]);
  readonly heraldNoun = signal<string>(HERALD_NOUNS[0]);
  readonly heraldVerb = signal<string>(HERALD_VERBS[0]);

  readonly heraldPreview = computed<string>(
    () =>
      formatHeraldGreeting(
        this.heraldTemplateId(),
        this.heraldAdjective(),
        this.heraldNoun(),
        this.heraldVerb(),
      ).formatted,
  );

  // Terminal Input
  readonly terminalCommandText = signal<string>('');

  // Chaos Gate Dialer Controls
  readonly dialEra = signal<ServerEraLetter>('Θ');
  readonly dialAtmosphere = signal<AtmospherePrefix>('Scorching');
  readonly dialTheme = signal<StructuralTheme>('Clockwork');
  readonly dialBiome = signal<BiomeNoun>('Catacombs');

  // Onboarding Awakening Modal State
  readonly onboardingName = signal<string>('Vanguard_01');
  readonly onboardingArchetype = signal<ArchetypeClass>('Vanguard');
  readonly onboardingEra = signal<ServerEraLetter>('Θ');
  readonly onboardingAtmosphere = signal<AtmospherePrefix>('Scorching');
  readonly onboardingTheme = signal<StructuralTheme>('Clockwork');
  readonly onboardingBiome = signal<BiomeNoun>('Catacombs');
  readonly eraInfo = SERVER_ERAS;
  readonly onboardingElement = computed(() =>
    this.chaosGate.atmosphereElement(this.onboardingAtmosphere()),
  );
  /** One plain-language line per class for the new-game screen. */
  readonly classBlurbs: Record<ArchetypeClass, string> = {
    Vanguard: 'Sturdy fighter. Most strength and health.',
    Chronomancer: 'Spellcaster. Strongest magic, least health.',
    Hexblade: 'Quick blade with curses. Fastest class.',
    Artificer: 'Gadgets and ranged tech. Best at spotting secrets.',
  };

  // Mobile-First Viewport & Ergonomic State (Default: Delve Focus with 1st-Person & Mini-Map)
  readonly mobileLayoutMode = signal<'SPLIT' | 'STAGE' | 'MAP'>('STAGE');
  readonly stageLensMode = signal<'FIRST_PERSON' | 'CARD_STAGE'>('FIRST_PERSON');
  readonly gateDialerExpanded = signal<boolean>(false);
  readonly isMinimapCollapsed = signal<boolean>(false);

  // Interactive Stage & Map Popovers / Tooltips
  readonly hoveredMapNode = signal<{
    room: RoomNode;
    visited: boolean;
    adjacentRumor: boolean;
    sensoryPreview: string;
  } | null>(null);
  readonly activeSkillMenuMonsterId = signal<string | null>(null);
  readonly inlineEditingRoom = signal<boolean>(false);
  readonly digPopoverDirection = signal<ExitDirection | null>(null);

  // Visual Dig Popover & Inline Room Editor Form Signals
  readonly editRoomTitle = signal<string>('');
  readonly editRoomDesc = signal<string>('');
  readonly editRoomLegend = signal<CoreLegendType>('corridor');
  readonly digDirection = signal<ExitDirection>('E');
  readonly digTitle = signal<string>('Astral Relay Vault');
  readonly digDescription = signal<string>(
    'A newly excavated chamber humming with dormant Chaos Gate resonance.',
  );
  readonly digLegendType = signal<CoreLegendType>('corridor');
  readonly digSpawnMonster = signal<string>('NONE');
  readonly digSpawnLoot = signal<string>('NONE');
  readonly digSpawnTrap = signal<string>('NONE');

  readonly triggerWhen = signal<DeclarativeTrigger['when']>('ON_ENTER');
  readonly triggerIf = signal<string>('PER >= 12');
  readonly triggerDo = signal<DeclarativeTrigger['doAction']>('EMIT_LORE');
  readonly triggerPayload = signal<string>('Hidden memory crystal resonates!');
  readonly customLegendGlyph = signal<string>('✦');
  readonly customLegendLabel = signal<string>('Aether Conduit');
  readonly customLegendColor = signal<string>('#f472b6');

  // Unified Analytics & Statistics Sub-Tabs
  readonly analyticsSubTab = signal<'HEATMAP' | 'COMBAT' | 'CHRONICLE'>('HEATMAP');

  // Paperdoll & Inventory Filtering & Sorting
  readonly inventoryFilter = signal<string>('ALL');
  readonly inventoryCategoryFilter = signal<'ALL' | 'WEAPONS' | 'ARMOR' | 'RELICS' | 'CORES'>(
    'ALL',
  );
  readonly inventoryProvenanceFilter = signal<'ALL' | 'Verified Drop' | 'Architect Forged'>('ALL');
  readonly inventorySortBy = signal<'POWER_DESC' | 'POWER_ASC' | 'RARITY' | 'WEIGHT' | 'NAME'>(
    'POWER_DESC',
  );
  readonly inventorySearchQuery = signal<string>('');
  readonly selectedPaperdollSlot = signal<PaperdollSlotType | null>(null);
  readonly hoveredInventoryItem = signal<EquipmentItem | null>(null);

  // Bestiary & Compendium Search
  readonly chronicleSearch = signal<string>('');

  // P2P & Cartridge Import/Export
  readonly exportedCartridgeText = signal<string>('');

  // Spore QR Code & Portable Planar Seeds
  readonly shareableSporeUrl = computed<string>(() => {
    const char = this.engine.character();
    const addr = this.engine.activeGateAddress();
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : 'https://chris.github.io/linked-pocket-realms';
    return `${origin}#spore=${encodeURIComponent(addr.formatted)}&p=${encodeURIComponent(char.name)}&seed=${addr.seed}`;
  });

  readonly sporeQrSvgPath = computed<string>(() => {
    try {
      const url = this.shareableSporeUrl();
      const matrix = generateQrMatrix(url);
      return generateQrSvgPath(matrix);
    } catch {
      return '';
    }
  });

  readonly sporeQrSize = computed<number>(() => {
    try {
      const url = this.shareableSporeUrl();
      const matrix = generateQrMatrix(url);
      return matrix.length;
    } catch {
      return 25;
    }
  });

  readonly copiedSporeUrlSuccess = signal<boolean>(false);
  readonly sporeInputText = signal<string>('');

  copySporeUrl(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(this.shareableSporeUrl()).then(() => {
        this.copiedSporeUrlSuccess.set(true);
        setTimeout(() => this.copiedSporeUrlSuccess.set(false), 2500);
      });
    }
  }

  importSporeCode(): void {
    const raw = this.sporeInputText().trim();
    if (!raw) return;
    let addrStr = raw;
    if (raw.includes('#spore=')) {
      const match = raw.match(/#spore=([^&]+)/);
      if (match) addrStr = decodeURIComponent(match[1]);
    }
    const parsed = this.chaosGate.parseAddressString(addrStr);
    if (parsed) {
      const grafted = this.engine.graftOvergrowthIncursion(parsed, 'Spore Traveler');
      if (grafted.length > 0) {
        this.engine.activeConvergenceBanner.set({
          peerName: 'Spore Traveler',
          peerTriChord: parsed.formatted,
          localTheme: this.engine.activeGateAddress().theme,
          remoteTheme: parsed.theme,
          roomsGraftedCount: grafted.length,
          timestampMs: Date.now(),
        });
        this.soundFx.playConvergenceChime();
        this.soundFx.triggerHaptic('CONVERGENCE');
        this.engine.appendFeed(
          'NETWORK',
          `🌱 [Spore Grafted] Spliced ${grafted.length} rooms from spore code ${parsed.formatted}!`,
        );
      }
      this.sporeInputText.set('');
    } else {
      this.engine.appendFeed(
        'SYSTEM',
        'Invalid spore code or URL. Format must match: "Θ: Scorching Clockwork Catacombs".',
      );
    }
  }

  selectAnatomicalPart(part: MonsterBodyPart): void {
    if (part.isSevered) return;
    const current = this.engine.selectedTargetPartId();
    this.engine.selectTargetPart(current === part.id ? null : part.id);
  }

  // Computed Current Room Legend & Exits for Persistent Room Stage
  readonly currentRoomLegend = computed(() => {
    const r = this.engine.currentRoom();
    return this.legendRegistry.resolveEntry(r.legendType, r.customLegendId);
  });

  readonly currentRoomStageExits = computed<
    {
      direction: ExitDirection;
      arrow: string;
      dirLabel: string;
      targetRoomId: string;
      targetTitle: string;
      visited: boolean;
      isLocked: boolean;
      isSecret: boolean;
      rumorSignal: string;
    }[]
  >(() => {
    const cur = this.engine.currentRoom();
    const allRooms = this.engine.rooms();
    const visitedSet = new Set(this.engine.character().visitedRoomIds);
    const per = this.engine.effectiveAttributes().PER;
    const role = this.engine.perspective();

    const dirMeta: Record<ExitDirection, { arrow: string; label: string }> = {
      N: { arrow: '⬆', label: 'North' },
      S: { arrow: '⬇', label: 'South' },
      E: { arrow: '➡', label: 'East' },
      W: { arrow: '⬅', label: 'West' },
      U: { arrow: '⤊', label: 'Up' },
      D: { arrow: '⤋', label: 'Down' },
    };

    return cur.exits
      .filter((ex) => !ex.isSecret || per >= 12 || role === 'ARCHITECT')
      .map((ex) => {
        const target = allRooms.find((r) => r.id === ex.targetRoomId);
        const visited = visitedSet.has(ex.targetRoomId);
        const meta = dirMeta[ex.direction] ?? { arrow: '•', label: ex.direction };
        return {
          direction: ex.direction,
          arrow: meta.arrow,
          dirLabel: meta.label,
          targetRoomId: ex.targetRoomId,
          targetTitle:
            visited || role === 'ARCHITECT' ? (target?.title ?? 'Sector') : 'Unknown [?]',
          visited,
          isLocked: !!ex.isLocked,
          isSecret: !!ex.isSecret,
          rumorSignal: target?.rumorSignal ?? 'Uncharted resonance readings',
        };
      });
  });

  // Ghost `[+ Dig Room]` nodes on N/S/E/W edges in Architect Mode
  readonly architectGhostDigDirections = computed<
    { direction: ExitDirection; label: string; x: number; y: number }[]
  >(() => {
    if (this.engine.perspective() !== 'ARCHITECT') return [];
    const cur = this.engine.currentRoom();
    const existingDirs = new Set(cur.exits.map((e) => e.direction));
    const offsets: { direction: ExitDirection; label: string; dx: number; dy: number }[] = [
      {
        direction: 'N',
        label: '+ Dig North',
        dx: cur.y < 120 ? 75 : 0,
        dy: cur.y < 120 ? -55 : -90,
      },
      { direction: 'S', label: '+ Dig South', dx: 0, dy: 90 },
      { direction: 'E', label: '+ Dig East', dx: 115, dy: 0 },
      { direction: 'W', label: '+ Dig West', dx: -115, dy: 0 },
    ];
    return offsets
      .filter((o) => !existingDirs.has(o.direction))
      .map((o) => ({
        direction: o.direction,
        label: o.label,
        x: Math.max(45, Math.min(895, cur.x + o.dx)),
        y: Math.max(28, Math.min(525, cur.y + o.dy)),
      }));
  });

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
      sensoryPreview: string;
    }[]
  >(() => {
    const allRooms = this.engine.rooms();
    const char = this.engine.character();
    const visitedSet = new Set(char.visitedRoomIds);
    const role = this.engine.perspective();
    const visitors = this.transport.activeVisitorsList();
    const metrics = this.engine.telemetry().roomMetrics;
    const heatMode = this.engine.heatmapMode();
    const per = this.engine.effectiveAttributes().PER;

    // Find rooms adjacent to visited rooms
    const adjacentSet = new Set<string>();
    for (const r of allRooms) {
      if (visitedSet.has(r.id)) {
        for (const ex of r.exits) {
          if (!ex.isSecret || per >= 12 || role === 'ARCHITECT') {
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

        const dangerLevel =
          r.legendType === 'elite-boss'
            ? 'Extreme (Boss)'
            : r.monsters.length > 0
              ? 'Elevated (Hostiles)'
              : r.legendType === 'safe-campfire'
                ? 'Safe Sanctuary'
                : 'Low';
        const sensoryPreview = visited
          ? `${r.title} • ${leg.label}`
          : `Danger: ${dangerLevel} | ${r.rumorSignal} (PER ${per} Scan)`;

        return {
          room: r,
          visited,
          adjacentRumor,
          glyph: visited || role !== 'EXPLORER' ? leg.glyph : '?',
          colorHex: visited || role !== 'EXPLORER' ? leg.colorHex : '#64748b',
          heatmapColor,
          visitorNames: roomVisitors,
          sensoryPreview,
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
    let inv = this.engine.character().inventory;

    // 1. Slot Filter from clicked Paperdoll slot
    const slotFilter = this.selectedPaperdollSlot();
    if (slotFilter) {
      if (slotFilter === 'Relic 1' || slotFilter === 'Relic 2') {
        inv = inv.filter((i) => i.slot === 'Relic 1' || i.slot === 'Relic 2');
      } else {
        inv = inv.filter((i) => i.slot === slotFilter);
      }
    }

    // 2. Category Filter
    const cat = this.inventoryCategoryFilter();
    if (cat === 'WEAPONS') {
      inv = inv.filter((i) => i.slot === 'Main-Hand' || i.slot === 'Off-Hand');
    } else if (cat === 'ARMOR') {
      inv = inv.filter((i) => i.slot === 'Head' || i.slot === 'Chest' || i.slot === 'Legs');
    } else if (cat === 'RELICS') {
      inv = inv.filter((i) => i.slot === 'Relic 1' || i.slot === 'Relic 2');
    } else if (cat === 'CORES') {
      inv = inv.filter((i) => !!i.isSphereCore);
    }

    // 3. Provenance Filter
    const prov = this.inventoryProvenanceFilter();
    if (prov !== 'ALL') {
      inv = inv.filter((i) => i.provenance === prov);
    }

    // Legacy inventoryFilter compatibility
    const legacyFilter = this.inventoryFilter();
    if (legacyFilter !== 'ALL') {
      inv = inv.filter((i) => i.slot === legacyFilter || i.provenance === legacyFilter);
    }

    // 4. Search Filter
    const q = this.inventorySearchQuery().trim().toLowerCase();
    if (q) {
      inv = inv.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.slot.toLowerCase().includes(q) ||
          i.rarity.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)),
      );
    }

    // 5. Sorting
    const sort = this.inventorySortBy();
    const sorted = [...inv];
    const getScore = (it: EquipmentItem) => it.clampedStatBudget ?? it.totalStatBudget;
    const rarityRank = (r: string) =>
      r === 'Mythic' ? 4 : r === 'Relic' ? 3 : r === 'Rare' ? 2 : 1;

    if (sort === 'POWER_DESC') {
      sorted.sort((a, b) => getScore(b) - getScore(a));
    } else if (sort === 'POWER_ASC') {
      sorted.sort((a, b) => getScore(a) - getScore(b));
    } else if (sort === 'RARITY') {
      sorted.sort(
        (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || getScore(b) - getScore(a),
      );
    } else if (sort === 'WEIGHT') {
      sorted.sort((a, b) => b.weight - a.weight);
    } else if (sort === 'NAME') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
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

  setMobileLayoutMode(mode: 'SPLIT' | 'STAGE' | 'MAP'): void {
    this.mobileLayoutMode.set(mode);
  }

  setStageLensMode(mode: 'FIRST_PERSON' | 'CARD_STAGE' | 'SPLIT'): void {
    const targetMode = mode === 'SPLIT' ? 'FIRST_PERSON' : mode;
    this.stageLensMode.set(targetMode);
  }

  getFacingRotationAngle(facing: string): number {
    switch (facing) {
      case 'N':
        return 0;
      case 'E':
        return 90;
      case 'S':
        return 180;
      case 'W':
        return 270;
      default:
        return 0;
    }
  }

  pruneCurrentRoom(): void {
    this.engine.pruneRoom();
  }

  simulateThunderpassIncursion(): void {
    this.thunderpass.simulateThunderpassCollision();
  }

  scanBleRelic(): void {
    void this.thunderpass.scanNearbyBleRelic();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    const activeEl = document.activeElement;
    if (
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      this.toggleObservatoryMap();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (this.isWritingInscription()) {
        this.isWritingInscription.set(false);
      } else if (this.mobileLayoutMode() === 'MAP') {
        this.setMobileLayoutMode('STAGE');
      } else if (this.engine.activeDrawer() !== 'NONE') {
        this.engine.activeDrawer.set('NONE');
      }
    } else if (event.key >= '1' && event.key <= '4') {
      const idx = parseInt(event.key, 10) - 1;
      const skills = this.engine.character().activeSkills;
      if (idx >= 0 && idx < skills.length) {
        event.preventDefault();
        this.onSkillButtonClick(skills[idx]);
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (this.engine.inActiveCombat()) {
        const mobs = this.engine.livingRoomMonsters();
        if (mobs.length > 0) {
          const target = mobs.find((m) => m.id === this.engine.selectedTargetId()) || mobs[0];
          this.onStageAttackMonster(target);
        }
      } else {
        this.engine.toggleAutoAttack();
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const mobs = this.engine.livingRoomMonsters();
      if (mobs.length > 0) {
        const currentTargetId = this.engine.selectedTargetId();
        const curIdx = mobs.findIndex((m) => m.id === currentTargetId);
        const nextIdx = (curIdx + 1) % mobs.length;
        this.engine.selectedTargetId.set(mobs[nextIdx].id);
      }
    } else if (event.key === 'i' || event.key === 'I' || event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      this.toggleDrawer('PAPERDOLL');
    } else if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      this.toggleDrawer('NETWORK');
    }
  }

  openInscriptionPrompt(): void {
    this.inscriptionDraft.set('');
    this.isWritingInscription.set(true);
  }

  confirmChalkInscription(): void {
    const text = this.inscriptionDraft().trim();
    if (text) {
      this.engine.leaveChalkInscription(text);
    }
    this.isWritingInscription.set(false);
  }

  delveSplicedWing(): void {
    const banner = this.engine.activeConvergenceBanner();
    if (banner) {
      const overgrowthRoom = this.engine.rooms().find((r) => r.isOvergrowth || r.isSynthesisSeam);
      if (overgrowthRoom) {
        this.engine.moveToRoom(overgrowthRoom.id);
      }
      this.engine.dismissConvergenceBanner();
    }
  }

  toggleObservatoryMap(): void {
    if (this.mobileLayoutMode() === 'MAP') {
      this.setMobileLayoutMode('STAGE');
    } else {
      this.setMobileLayoutMode('MAP');
    }
  }

  setPerspective(role: PerspectiveRole): void {
    this.engine.perspective.set(role);
    if (role === 'ARCHITECT') {
      if (this.mobileLayoutMode() === 'STAGE') {
        this.mobileLayoutMode.set('SPLIT');
      }
      this.syncArchitectEditorWithSelectedRoom();
    } else if (role === 'EXPLORER') {
      if (this.mobileLayoutMode() === 'MAP' || this.mobileLayoutMode() === 'SPLIT') {
        this.mobileLayoutMode.set('STAGE');
      }
    } else if (role === 'SPECTATOR') {
      if (this.mobileLayoutMode() === 'STAGE') {
        this.mobileLayoutMode.set('SPLIT');
      }
      if (!this.engine.activeReplayEntry()) {
        const firstGuest = this.engine.telemetry().guestbook[0] ?? null;
        this.engine.activeReplayEntry.set(firstGuest);
        this.engine.replayCursorIndex.set(0);
      }
    }
  }

  toggleDrawer(tab: DrawerTab): void {
    if (tab === 'COMBAT_TELEMETRY') {
      this.analyticsSubTab.set('COMBAT');
      this.engine.activeDrawer.set('REALM_ANALYTICS');
      return;
    }
    if (tab === 'CHRONICLE') {
      this.analyticsSubTab.set('CHRONICLE');
      this.engine.activeDrawer.set('REALM_ANALYTICS');
      return;
    }
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

  selectPaperdollSlot(slot: PaperdollSlotType): void {
    if (this.selectedPaperdollSlot() === slot) {
      this.selectedPaperdollSlot.set(null);
    } else {
      this.selectedPaperdollSlot.set(slot);
    }
  }

  clearSlotFilter(): void {
    this.selectedPaperdollSlot.set(null);
  }

  submitTerminalCommand(): void {
    const cmd = this.terminalCommandText();
    if (!cmd.trim()) return;
    const lower = cmd.trim().toLowerCase();
    if (lower === 'map' || lower === '@map' || lower === 'observatory') {
      this.toggleObservatoryMap();
    }
    this.engine.parseAndDispatchTerminalInput(cmd);
    this.terminalCommandText.set('');
  }

  quickSayPrompt(): void {
    const current = this.terminalCommandText().trim();
    if (
      current &&
      !current.toLowerCase().startsWith('say ') &&
      !current.startsWith("'") &&
      !current.toLowerCase().startsWith('shout ')
    ) {
      this.engine.broadcastChatMessage('ROOM', current);
      this.terminalCommandText.set('');
    } else {
      this.terminalCommandText.set('say Greetings, travelers of the Loom!');
      const el = document.getElementById('mud-cmd-input') as HTMLInputElement | null;
      el?.focus();
    }
  }

  quickShoutPrompt(): void {
    const current = this.terminalCommandText().trim();
    if (
      current &&
      !current.toLowerCase().startsWith('say ') &&
      !current.startsWith("'") &&
      !current.toLowerCase().startsWith('shout ')
    ) {
      this.engine.broadcastChatMessage('SHOUT', current);
      this.terminalCommandText.set('');
    } else {
      this.terminalCommandText.set('shout Echoes resound across the Chaos Gate!');
      const el = document.getElementById('mud-cmd-input') as HTMLInputElement | null;
      el?.focus();
    }
  }

  // Tactile Stage Entity Actions (with automatic Syntax Echo Teaching)
  onStageAttackMonster(mob: MonsterEntity): void {
    this.engine.selectTargetMonster(mob.id);
    const partId = this.engine.selectedTargetPartId();
    this.engine.dispatchCommandIntent({
      type: 'ATTACK',
      rawInput: `attack ${mob.name.toLowerCase()}`,
      source: 'HUD',
      targetId: mob.id,
      payload: partId ? { targetPartId: partId } : undefined,
    });
  }

  onStageCastSkillOnMonster(skill: SkillSlot, mob: MonsterEntity): void {
    this.engine.selectTargetMonster(mob.id);
    this.activeSkillMenuMonsterId.set(null);
    const partId = this.engine.selectedTargetPartId();
    this.engine.dispatchCommandIntent({
      type: 'CAST_SKILL',
      rawInput: `cast ${skill.commandKey} ${mob.name.toLowerCase()}`,
      source: 'HUD',
      skillKey: skill.commandKey,
      targetId: mob.id,
      payload: partId ? { targetPartId: partId } : undefined,
    });
  }

  onStageInspectMonster(mob: MonsterEntity): void {
    this.engine.dispatchCommandIntent({
      type: 'INSPECT',
      rawInput: `inspect ${mob.name.toLowerCase()}`,
      source: 'HUD',
      targetId: mob.id,
    });
  }

  onStageTakeItem(item: EquipmentItem): void {
    this.engine.dispatchCommandIntent({
      type: 'TAKE_ITEM',
      rawInput: `take ${item.name.toLowerCase()}`,
      source: 'HUD',
      targetId: item.id,
    });
  }

  onStageTakeAllItems(): void {
    this.engine.dispatchCommandIntent({
      type: 'TAKE_ALL_ITEMS',
      rawInput: 'take all',
      source: 'HUD',
    });
  }

  onStageTakeAndEquipItem(item: EquipmentItem): void {
    this.engine.takeAndEquipRoomItem(item.id);
  }

  onStageInspectItem(item: EquipmentItem): void {
    this.engine.dispatchCommandIntent({
      type: 'INSPECT',
      rawInput: `inspect ${item.name.toLowerCase()}`,
      source: 'HUD',
      targetId: item.id,
    });
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
    } else if (badge.actionType === 'TAKE_ALL_ITEMS') {
      this.engine.dispatchCommandIntent({
        type: 'TAKE_ALL_ITEMS',
        rawInput: 'take all',
        source: 'HUD',
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
    const targetMob =
      this.engine.livingRoomMonsters().find((m) => m.id === this.engine.selectedTargetId()) ??
      this.engine.livingRoomMonsters()[0];
    const partId = this.engine.selectedTargetPartId();
    this.engine.dispatchCommandIntent({
      type: 'CAST_SKILL',
      rawInput: `cast ${skill.commandKey}${targetMob ? ' ' + targetMob.name.toLowerCase() : ''}`,
      source: 'HUD',
      skillKey: skill.commandKey,
      targetId: targetMob?.id,
      payload: partId ? { targetPartId: partId } : undefined,
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
    const curRoom = this.engine.currentRoom();
    const exit = curRoom.exits.find((e) => e.targetRoomId === room.id);
    if (exit) {
      this.onDirectionClick(exit.direction);
      if (this.engine.perspective() === 'ARCHITECT') {
        this.engine.selectedArchitectRoomId.set(room.id);
        this.syncArchitectEditorWithSelectedRoom();
      }
      return;
    }
    if (this.engine.perspective() === 'ARCHITECT') {
      this.engine.selectedArchitectRoomId.set(room.id);
      this.engine.moveToRoom(room.id);
      this.syncArchitectEditorWithSelectedRoom();
      return;
    }
    if (this.engine.character().visitedRoomIds.includes(room.id)) {
      this.engine.moveToRoom(room.id);
    }
  }

  openDigPopover(dir: ExitDirection): void {
    this.digDirection.set(dir);
    this.digPopoverDirection.set(dir);
    this.rollProceduralRoomDraft();
  }

  rollProceduralRoomDraft(): void {
    const addr = this.engine.activeGateAddress();
    const adjectives = ['Resonant', 'Gilded', 'Forgotten', 'Sunken', 'Subterranean', 'Astral'];
    const nouns = ['Reliquary', 'Dynamo', 'Vestry', 'Conduit', 'Gallery', 'Laboratory'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    this.digTitle.set(`${addr.atmosphere} ${adj} ${noun}`);
    this.digDescription.set(
      `A ${addr.theme.toLowerCase()} ${noun.toLowerCase()} pulsing with ${addr.atmosphere.toLowerCase()} ley-energy within the ${addr.biome.toLowerCase()}.`,
    );
  }

  confirmVisualDigRoom(): void {
    const dir = this.digDirection();
    this.engine.dispatchCommandIntent({
      type: 'MOO_DIG',
      rawInput: `@dig ${dir} ${this.digTitle()}`,
      source: 'HUD',
      payload: {
        direction: dir,
        title: this.digTitle(),
        description: this.digDescription(),
        legendType: this.digLegendType(),
        spawnMonsterName: this.digSpawnMonster(),
        spawnLootName: this.digSpawnLoot(),
        spawnTrapName: this.digSpawnTrap(),
      },
    });
    this.digPopoverDirection.set(null);
    this.syncArchitectEditorWithSelectedRoom();
  }

  openInlineRoomEditor(): void {
    this.engine.selectedArchitectRoomId.set(this.engine.currentRoom().id);
    this.syncArchitectEditorWithSelectedRoom();
    this.inlineEditingRoom.set(true);
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
    this.inlineEditingRoom.set(false);
  }

  architectDigNewRoom(): void {
    this.confirmVisualDigRoom();
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

  rollHeraldGreeting(): void {
    const rolled = rollRandomHeraldGreeting();
    this.heraldTemplateId.set(rolled.templateId);
    this.heraldAdjective.set(rolled.adjective);
    this.heraldNoun.set(rolled.noun);
    this.heraldVerb.set(rolled.verb);
  }

  applyHeraldGreeting(): void {
    this.engine.setHeraldGreeting(
      this.heraldTemplateId(),
      this.heraldAdjective(),
      this.heraldNoun(),
      this.heraldVerb(),
    );
  }

  spinRandomOnboardingGate(): void {
    const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    this.onboardingEra.set(rand(this.serverEras));
    this.onboardingAtmosphere.set(rand(this.atmospheres));
    this.onboardingTheme.set(rand(this.themes));
    this.onboardingBiome.set(rand(this.biomes));
  }

  finishOnboardingModal(): void {
    this.dialEra.set(this.onboardingEra());
    this.dialAtmosphere.set(this.onboardingAtmosphere());
    this.dialTheme.set(this.onboardingTheme());
    this.dialBiome.set(this.onboardingBiome());
    const greeting = formatHeraldGreeting(
      this.heraldTemplateId(),
      this.heraldAdjective(),
      this.heraldNoun(),
      this.heraldVerb(),
    );
    this.engine.completeOnboardingAwakening(
      this.onboardingName(),
      this.onboardingArchetype(),
      this.onboardingEra(),
      this.onboardingAtmosphere(),
      this.onboardingTheme(),
      this.onboardingBiome(),
      greeting,
    );
  }

  selectReplayGuestbook(entry: GuestbookGravestoneEntry): void {
    this.engine.activeReplayEntry.set(entry);
    this.engine.replayCursorIndex.set(0);
    this.engine.perspective.set('SPECTATOR');
  }

  getItemStatDiff(item: EquipmentItem): {
    powerDiff: number;
    atkDiff: number;
    mitDiff: number;
    speedDiff: number;
    isUpgrade: boolean;
    equippedItem: EquipmentItem | null;
    summary: string;
  } {
    const equipped = this.engine.character().paperdoll[item.slot];
    const itemPower = item.clampedStatBudget ?? item.totalStatBudget;
    const eqPower = equipped ? (equipped.clampedStatBudget ?? equipped.totalStatBudget) : 0;
    const powerDiff = itemPower - eqPower;

    const itemAtk = item.statBonuses.atkBonus ?? 0;
    const eqAtk = equipped?.statBonuses.atkBonus ?? 0;
    const atkDiff = itemAtk - eqAtk;

    const itemSpeed = item.statBonuses.speedPctBonus ?? 0;
    const eqSpeed = equipped?.statBonuses.speedPctBonus ?? 0;
    const speedDiff = itemSpeed - eqSpeed;

    const itemMit = item.statBonuses.mitigationBonus ?? 0;
    const eqMit = equipped?.statBonuses.mitigationBonus ?? 0;
    const mitDiff = itemMit - eqMit;

    const isUpgrade = powerDiff > 0 || atkDiff > 0;

    const atkSign = atkDiff >= 0 ? `+${atkDiff}` : `${atkDiff}`;
    const spdSign = speedDiff >= 0 ? `+${speedDiff}%` : `${speedDiff}%`;
    const powerSign = powerDiff >= 0 ? `+${powerDiff}` : `${powerDiff}`;

    const summary = equipped
      ? `${powerSign} Power (${atkSign} ATK / ${spdSign} Speed) vs. equipped`
      : `+${itemPower} Power (${atkSign} ATK / ${spdSign} Speed) vs Empty`;

    return {
      powerDiff,
      atkDiff,
      mitDiff,
      speedDiff,
      isUpgrade,
      equippedItem: equipped ?? null,
      summary,
    };
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

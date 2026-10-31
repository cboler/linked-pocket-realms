import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ActiveStatusEffect,
  ArchetypeClass,
  AtmospherePrefix,
  BiomeNoun,
  ChaosGateAddress,
  CharacterState,
  CommandIntent,
  CompassDirection,
  CoreAttributes,
  CoreLegendType,
  DeclarativeTrigger,
  DerivedCombatStats,
  DrawerTab,
  EquipmentItem,
  ExitDirection,
  GuestbookGravestoneEntry,
  HeatmapMode,
  MonsterEntity,
  NetworkPacket,
  P2PChatMessage,
  PaperdollSlotType,
  PassiveTrait,
  PerspectiveRole,
  RealmDelta,
  ReplayFrame,
  RoomNode,
  ServerEraLetter,
  SkillSlot,
  StructuralTheme,
  TelemetryLog,
  TerminalFeedLine,
  TravelerEcho,
  HeraldGreeting,
  HERALD_ADJECTIVES,
  HERALD_NOUNS,
  HERALD_VERBS,
  formatHeraldGreeting,
  rollRandomHeraldGreeting,
} from '../models/domain.models';
import { ChaosGateService, createMulberry32 } from './chaos-gate.service';
import { LegendRegistryService } from './legend-registry.service';
import { StorageService } from './storage.service';
import { TransportService } from './transport.service';

export const ARCHETYPE_CATALOG: Record<
  ArchetypeClass,
  {
    baseAttributes: CoreAttributes;
    skills: Omit<SkillSlot, 'currentCooldownMs'>[];
    passives: PassiveTrait[];
  }
> = {
  Vanguard: {
    baseAttributes: { STR: 15, DEX: 11, INT: 8, PER: 11, VIT: 15 },
    skills: [
      {
        id: 'sk-sunder',
        name: 'Sunder Strike',
        commandKey: 'sunder',
        archetype: 'Vanguard',
        staminaCost: 14,
        cooldownMs: 2500,
        powerMultiplier: 1.45,
        element: 'Physical',
        statusApplied: 'Sunder',
        description: 'Crushes armor plating, applying Sunder (-20% mitigation).',
      },
      {
        id: 'sk-cinder-cleave',
        name: 'Cinder Cleave',
        commandKey: 'cleave',
        archetype: 'Vanguard',
        staminaCost: 18,
        cooldownMs: 3500,
        powerMultiplier: 1.65,
        element: 'Fire',
        statusApplied: 'Burn',
        comboTriggerStatus: 'Sunder',
        description: 'Thermal blade arc. Deals +40% bonus damage if target is Sundered.',
      },
      {
        id: 'sk-aegis-pulse',
        name: 'Aegis Shock',
        commandKey: 'aegis',
        archetype: 'Vanguard',
        staminaCost: 16,
        cooldownMs: 4000,
        powerMultiplier: 1.25,
        element: 'Lightning',
        statusApplied: 'Overcharge',
        description: 'Shield discharge that electrifies the target and restores 15 HP.',
      },
      {
        id: 'sk-seismic-slam',
        name: 'Seismic Finisher',
        commandKey: 'slam',
        archetype: 'Vanguard',
        staminaCost: 24,
        cooldownMs: 5500,
        powerMultiplier: 2.1,
        element: 'Physical',
        comboTriggerStatus: 'Burn',
        description: 'Devastating tectonic impact that detonates active Burn stacks.',
      },
    ],
    passives: [
      {
        id: 'pas-bulwark',
        name: 'Bastion Plating',
        archetype: 'Vanguard',
        description: '+3 VIT and +2 STR when standing in hostile sectors.',
        statModifier: { VIT: 3, STR: 2 },
      },
      {
        id: 'pas-tactical-eye',
        name: 'Sentinel Optics',
        archetype: 'Vanguard',
        description: '+2 PER to spot hidden mechanical locks and trap triggers.',
        statModifier: { PER: 2 },
      },
    ],
  },
  Chronomancer: {
    baseAttributes: { STR: 8, DEX: 14, INT: 16, PER: 13, VIT: 10 },
    skills: [
      {
        id: 'sk-sunder',
        name: 'Entropy Fracture',
        commandKey: 'sunder',
        archetype: 'Chronomancer',
        staminaCost: 14,
        cooldownMs: 2400,
        powerMultiplier: 1.4,
        element: 'Void',
        statusApplied: 'Sunder',
        description: 'Warps local spacetime around the target, inflicting Sunder.',
      },
      {
        id: 'sk-cryo-stasis',
        name: 'Cryo Stasis',
        commandKey: 'stasis',
        archetype: 'Chronomancer',
        staminaCost: 16,
        cooldownMs: 3200,
        powerMultiplier: 1.55,
        element: 'Frost',
        statusApplied: 'Chill',
        comboTriggerStatus: 'Sunder',
        description: 'Freezes target timeline, slowing enemy ATB fill rate.',
      },
      {
        id: 'sk-arc-tachyon',
        name: 'Tachyon Surge',
        commandKey: 'tachyon',
        archetype: 'Chronomancer',
        staminaCost: 18,
        cooldownMs: 3800,
        powerMultiplier: 1.75,
        element: 'Lightning',
        statusApplied: 'Overcharge',
        comboTriggerStatus: 'Chill',
        description: 'High-frequency bolt that shatters Chilled targets.',
      },
      {
        id: 'sk-nova-collapse',
        name: 'Singularity Nova',
        commandKey: 'nova',
        archetype: 'Chronomancer',
        staminaCost: 25,
        cooldownMs: 5500,
        powerMultiplier: 2.25,
        element: 'Fire',
        statusApplied: 'Burn',
        comboTriggerStatus: 'Overcharge',
        description: 'Collapses a pocket star onto Overcharged targets.',
      },
    ],
    passives: [
      {
        id: 'pas-haste',
        name: 'Temporal Slipstream',
        archetype: 'Chronomancer',
        description: '+3 DEX and +3 INT for rapid ATB cycling.',
        statModifier: { DEX: 3, INT: 3 },
      },
      {
        id: 'pas-foresight',
        name: 'Causality Lens',
        archetype: 'Chronomancer',
        description: '+3 PER for bestiary and puzzle inspection.',
        statModifier: { PER: 3 },
      },
    ],
  },
  Hexblade: {
    baseAttributes: { STR: 13, DEX: 14, INT: 13, PER: 11, VIT: 11 },
    skills: [
      {
        id: 'sk-sunder',
        name: 'Hex Sunder',
        commandKey: 'sunder',
        archetype: 'Hexblade',
        staminaCost: 14,
        cooldownMs: 2400,
        powerMultiplier: 1.45,
        element: 'Bio',
        statusApplied: 'Sunder',
        description: 'Corrosive hex-brand that weakens target defenses.',
      },
      {
        id: 'sk-umbral-lunge',
        name: 'Umbral Lunge',
        commandKey: 'lunge',
        archetype: 'Hexblade',
        staminaCost: 16,
        cooldownMs: 3000,
        powerMultiplier: 1.65,
        element: 'Void',
        statusApplied: 'Chill',
        comboTriggerStatus: 'Sunder',
        description: 'Shadow-step strike that exploits Sundered targets.',
      },
      {
        id: 'sk-hellfire-brand',
        name: 'Hellfire Brand',
        commandKey: 'brand',
        archetype: 'Hexblade',
        staminaCost: 18,
        cooldownMs: 3600,
        powerMultiplier: 1.7,
        element: 'Fire',
        statusApplied: 'Burn',
        description: 'Sears the enemy with abyssal flame.',
      },
      {
        id: 'sk-soul-reap',
        name: 'Soul Reap',
        commandKey: 'reap',
        archetype: 'Hexblade',
        staminaCost: 22,
        cooldownMs: 5000,
        powerMultiplier: 2.0,
        element: 'Void',
        comboTriggerStatus: 'Burn',
        description: 'Harvests burning vitality, healing the caster on hit.',
      },
    ],
    passives: [
      {
        id: 'pas-hex-edge',
        name: 'Pact Edge',
        archetype: 'Hexblade',
        description: '+2 STR, +2 DEX, +2 INT.',
        statModifier: { STR: 2, DEX: 2, INT: 2 },
      },
      {
        id: 'pas-witch-sight',
        name: 'Occult Sight',
        archetype: 'Hexblade',
        description: '+2 PER.',
        statModifier: { PER: 2 },
      },
    ],
  },
  Artificer: {
    baseAttributes: { STR: 10, DEX: 12, INT: 15, PER: 15, VIT: 11 },
    skills: [
      {
        id: 'sk-sunder',
        name: 'Armor-Piercing Slug',
        commandKey: 'sunder',
        archetype: 'Artificer',
        staminaCost: 13,
        cooldownMs: 2200,
        powerMultiplier: 1.45,
        element: 'Physical',
        statusApplied: 'Sunder',
        description: 'High-velocity kinetic round that Sunders enemy armor.',
      },
      {
        id: 'sk-voltaic-coil',
        name: 'Voltaic Coil',
        commandKey: 'coil',
        archetype: 'Artificer',
        staminaCost: 16,
        cooldownMs: 3100,
        powerMultiplier: 1.6,
        element: 'Lightning',
        statusApplied: 'Overcharge',
        comboTriggerStatus: 'Sunder',
        description: 'Deploys an arc-turret discharge that Overcharges Sundered foes.',
      },
      {
        id: 'sk-thermite-canister',
        name: 'Thermite Canister',
        commandKey: 'thermite',
        archetype: 'Artificer',
        staminaCost: 18,
        cooldownMs: 3500,
        powerMultiplier: 1.75,
        element: 'Fire',
        statusApplied: 'Burn',
        comboTriggerStatus: 'Overcharge',
        description: 'Ignites Overcharged targets with white-hot thermite.',
      },
      {
        id: 'sk-cryo-mortar',
        name: 'Cryo Mortar',
        commandKey: 'mortar',
        archetype: 'Artificer',
        staminaCost: 20,
        cooldownMs: 4500,
        powerMultiplier: 1.95,
        element: 'Frost',
        statusApplied: 'Chill',
        comboTriggerStatus: 'Burn',
        description: 'Thermal shock shell that cracks superheated armor.',
      },
    ],
    passives: [
      {
        id: 'pas-overclock',
        name: 'Clockwork Overdrive',
        archetype: 'Artificer',
        description: '+3 INT and +3 PER.',
        statModifier: { INT: 3, PER: 3 },
      },
      {
        id: 'pas-stabilizer',
        name: 'Gyro Stabilizer',
        archetype: 'Artificer',
        description: '+2 DEX and +2 VIT.',
        statModifier: { DEX: 2, VIT: 2 },
      },
    ],
  },
};

@Injectable({
  providedIn: 'root',
})
export class MudEngineService implements OnDestroy {
  private readonly chaosGate = inject(ChaosGateService);
  private readonly legendRegistry = inject(LegendRegistryService);
  private readonly storage = inject(StorageService);
  private readonly transport = inject(TransportService);

  private atbIntervalId: ReturnType<typeof setInterval> | null = null;
  private beaconIntervalId: ReturnType<typeof setInterval> | null = null;
  private netSub?: Subscription;
  private combatRng = createMulberry32(0x9e3779b9);
  private tickCounter = 0;
  private roomEnteredAtMs = Date.now();
  private currentRunReplayFrames: ReplayFrame[] = [];

  // UI Perspective & Active Drawer State
  readonly perspective = signal<PerspectiveRole>('EXPLORER');
  readonly activeDrawer = signal<DrawerTab>('NONE');
  readonly heatmapMode = signal<HeatmapMode>('LETHALITY');
  readonly selectedArchitectRoomId = signal<string>('room-0');
  readonly selectedTargetId = signal<string | null>(null);
  readonly needsOnboarding = signal<boolean>(false);
  readonly tickerCollapsed = signal<boolean>(false);
  private pendingSyntaxEcho: string | undefined;
  readonly inspectedEntity = signal<{
    type: 'MONSTER' | 'ITEM' | 'ROOM';
    title: string;
    subtitle: string;
    details: string[];
    secretRevealed: boolean;
    requiredPer: number;
  } | null>(null);

  // Replay Scrubbing State (Spectator View)
  readonly activeReplayEntry = signal<GuestbookGravestoneEntry | null>(null);
  readonly replayCursorIndex = signal<number>(0);

  // Home vs Visiting Realm State
  readonly isVisitingExternalRealm = signal<boolean>(false);
  readonly homeGateAddress = signal<ChaosGateAddress>(
    this.chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs'),
  );
  readonly activeGateAddress = signal<ChaosGateAddress>(
    this.chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs'),
  );

  readonly activeRealmDelta = signal<RealmDelta>(this.createInitialRealmDelta());
  readonly rooms = signal<RoomNode[]>([]);
  readonly playerFacing = signal<CompassDirection>('N');

  // Player Character State
  readonly character = signal<CharacterState>(this.createInitialCharacter('Vanguard'));

  // Queued Skill for ATB Execution
  readonly queuedSkillIntent = signal<CommandIntent | null>(null);

  // Terminal Feed
  readonly terminalFeed = signal<TerminalFeedLine[]>([]);
  readonly chatLog = signal<P2PChatMessage[]>([]);

  // Telemetry & Analytics State
  readonly telemetry = signal<TelemetryLog>(this.createInitialTelemetry());

  // Derived Signals
  readonly overgrowthCount = computed<number>(() => {
    return this.rooms().filter((r) => r.isOvergrowth).length;
  });

  readonly currentRoom = computed<RoomNode>(() => {
    const allRooms = this.rooms();
    const curId = this.character().currentRoomId;
    return allRooms.find((r) => r.id === curId) ?? allRooms[0];
  });

  readonly effectiveAttributes = computed<CoreAttributes>(() => {
    const char = this.character();
    const totals: CoreAttributes = { ...char.baseAttributes };
    for (const pas of char.passiveTraits) {
      totals.STR += pas.statModifier.STR ?? 0;
      totals.DEX += pas.statModifier.DEX ?? 0;
      totals.INT += pas.statModifier.INT ?? 0;
      totals.PER += pas.statModifier.PER ?? 0;
      totals.VIT += pas.statModifier.VIT ?? 0;
    }
    for (const item of Object.values(char.paperdoll)) {
      if (!item) continue;
      const scale = item.clampedScaleFactor ?? 1;
      totals.STR += Math.round((item.statBonuses.STR ?? 0) * scale);
      totals.DEX += Math.round((item.statBonuses.DEX ?? 0) * scale);
      totals.INT += Math.round((item.statBonuses.INT ?? 0) * scale);
      totals.PER += Math.round((item.statBonuses.PER ?? 0) * scale);
      totals.VIT += Math.round((item.statBonuses.VIT ?? 0) * scale);
    }
    return totals;
  });

  readonly derivedStats = computed<DerivedCombatStats>(() => {
    const attr = this.effectiveAttributes();
    const char = this.character();
    let gearAtk = 0;
    let gearSpeedPct = 0;
    let gearMit = 0;
    for (const item of Object.values(char.paperdoll)) {
      if (!item) continue;
      const scale = item.clampedScaleFactor ?? 1;
      gearAtk += Math.round((item.statBonuses.atkBonus ?? 0) * scale);
      gearSpeedPct += Math.round((item.statBonuses.speedPctBonus ?? 0) * scale);
      gearMit += Math.round((item.statBonuses.mitigationBonus ?? 0) * scale);
    }

    const maxHp = 90 + attr.VIT * 10 + char.level * 12;
    const maxStamina = 60 + attr.INT * 5 + attr.VIT * 3;
    const atk = Math.round(10 + attr.STR * 1.6 + attr.INT * 1.1 + gearAtk);
    const mitigationPct = Math.min(70, Math.round(6 + attr.VIT * 1.2 + gearMit));
    const critChancePct = Math.min(65, Math.round(8 + attr.DEX * 1.3 + attr.PER * 0.8));
    const critMultiplier = Number((1.5 + attr.DEX * 0.02).toFixed(2));
    const atbFillRatePerTick = Number(
      ((3.8 + attr.DEX * 0.22) * (1 + gearSpeedPct / 100)).toFixed(2),
    );

    return {
      maxHp,
      maxStamina,
      atk,
      mitigationPct,
      critChancePct,
      critMultiplier,
      atbFillRatePerTick,
    };
  });

  readonly livingRoomMonsters = computed<MonsterEntity[]>(() => {
    const room = this.currentRoom();
    if (!room) return [];
    return room.monsters.filter((m) => m.hp > 0);
  });

  readonly inActiveCombat = computed<boolean>(() => this.livingRoomMonsters().length > 0);

  readonly equippedWeight = computed<number>(() => {
    const char = this.character();
    const eqW = Object.values(char.paperdoll).reduce((acc, item) => acc + (item?.weight ?? 0), 0);
    const invW = char.inventory.reduce((acc, item) => acc + item.weight, 0);
    return eqW + invW;
  });

  constructor() {
    this.initializeEngine();
  }

  private initializeEngine(): void {
    const delta = this.activeRealmDelta();
    this.legendRegistry.mergeHostCustomLegends(delta.customLegendEntries);
    const generated = this.chaosGate.generateRealm(this.activeGateAddress(), delta);
    this.rooms.set(generated);
    this.emitCurrentRoomNarrative();

    // Load persisted state asynchronously if present in IndexedDB
    void this.hydrateFromStorage();

    // Subscribe to P2P transport packets
    this.netSub = this.transport.packets$.subscribe((pkt) => this.onNetworkPacket(pkt));

    // Seed a simulated neighboring Chaos Gate beacon so the Anchor Portal immediately shows a discoverable P2P realm
    const demoNeighborAddress = this.chaosGate.createAddress(
      'Δ',
      'Silent',
      'Fungal',
      'Observatory',
    );
    this.transport.injectSimulatedPeerBeacon({
      peerId: 'peer-astral-echo',
      playerName: 'Kite_Zero',
      archetype: 'Chronomancer',
      level: 4,
      gateAddress: demoNeighborAddress.formatted,
      currentRoomId: 'room-2',
      inCombat: true,
      lastSeenMs: Date.now(),
      transport: 'BroadcastChannel',
      heraldGreeting: 'Beware: Eldritch Shadow lurks ahead.',
    });

    this.startAtbLoop();
  }

  private async hydrateFromStorage(): Promise<void> {
    await this.storage.ensurePlayerIdentityKeys();
    const savedDelta = await this.storage.loadHomeRealmDelta();
    if (savedDelta && savedDelta.gateAddress) {
      this.homeGateAddress.set(savedDelta.gateAddress);
      this.activeGateAddress.set(savedDelta.gateAddress);
      this.activeRealmDelta.set(savedDelta);
      this.legendRegistry.mergeHostCustomLegends(savedDelta.customLegendEntries);
      this.rooms.set(this.chaosGate.generateRealm(savedDelta.gateAddress, savedDelta));
    }
    const savedChar = await this.storage.loadCharacterState();
    if (savedChar && savedChar.name) {
      if (!savedChar.heraldGreeting) {
        savedChar.heraldGreeting = formatHeraldGreeting(0, 'Radiant', 'Beacon', 'triumph');
      }
      this.character.set(savedChar);
      this.needsOnboarding.set(false);
    } else {
      this.needsOnboarding.set(true);
    }
    const savedTel = await this.storage.loadTelemetryLog();
    if (savedTel && savedTel.combatSamples) {
      this.telemetry.set(savedTel);
    }
  }

  startAtbLoop(): void {
    if (this.atbIntervalId) return;
    // Deterministic 100ms ATB combat & status tick loop
    this.atbIntervalId = setInterval(() => {
      this.processAtbTick();
    }, 100);

    // Periodic P2P Gate Beacon every 4 seconds
    this.beaconIntervalId = setInterval(() => {
      const char = this.character();
      const cartridge = this.storage.exportCartridgeBase64(this.activeRealmDelta());
      this.transport.announceGateBeacon(
        char.name,
        this.activeGateAddress().formatted,
        char.currentRoomId,
        char.archetype,
        char.level,
        this.inActiveCombat(),
        cartridge,
        char.heraldGreeting?.formatted,
      );

      // Periodically announce to serverless gcloud broker if connected
      if (this.transport.brokerUrl().trim() && this.transport.isAutoAnnouncing()) {
        void this.transport.announcePresenceToBroker(
          char.name,
          this.activeGateAddress().formatted,
          char.heraldGreeting?.formatted,
        );
      }
    }, 4000);
  }

  stopAtbLoop(): void {
    if (this.atbIntervalId) {
      clearInterval(this.atbIntervalId);
      this.atbIntervalId = null;
    }
    if (this.beaconIntervalId) {
      clearInterval(this.beaconIntervalId);
      this.beaconIntervalId = null;
    }
  }

  /**
   * Public deterministic 100ms tick processor (callable directly in unit tests)
   */
  processAtbTick(): void {
    this.tickCounter++;
    const monsters = this.livingRoomMonsters();
    const char = this.character();
    const stats = this.derivedStats();

    // Recover cooldowns & decay status durations every 100ms
    let cooldownChanged = false;
    const updatedSkills = char.activeSkills.map((sk) => {
      if (sk.currentCooldownMs > 0) {
        cooldownChanged = true;
        return { ...sk, currentCooldownMs: Math.max(0, sk.currentCooldownMs - 100) };
      }
      return sk;
    });

    // Stamina gentle regeneration
    const nextStamina = Math.min(stats.maxStamina, char.stamina + 0.35);

    if (monsters.length === 0) {
      if (cooldownChanged || Math.floor(nextStamina) !== Math.floor(char.stamina)) {
        this.character.update((c) => ({
          ...c,
          stamina: nextStamina,
          activeSkills: updatedSkills,
        }));
      }
      return;
    }

    // Ensure a valid combat target is selected
    const currentTargetId = this.selectedTargetId();
    if (!currentTargetId || !monsters.some((m) => m.id === currentTargetId)) {
      this.selectedTargetId.set(monsters[0].id);
    }

    // Track status uptime telemetry
    for (const m of monsters) {
      for (const st of m.statuses) {
        this.telemetry.update((t) => ({
          ...t,
          statusUptimeMs: {
            ...t.statusUptimeMs,
            [st.tag]: (t.statusUptimeMs[st.tag] ?? 0) + 100,
          },
        }));
      }
    }

    // Advance Player ATB
    const nextPlayerAtb = Math.min(100, char.atbGauge + stats.atbFillRatePerTick);
    this.character.update((c) => ({
      ...c,
      atbGauge: nextPlayerAtb,
      stamina: nextStamina,
      activeSkills: updatedSkills,
    }));

    // Fire queued skill or auto-attack when ATB reaches 100%
    if (nextPlayerAtb >= 100) {
      const queued = this.queuedSkillIntent();
      if (queued) {
        this.queuedSkillIntent.set(null);
        this.executePlayerCombatMove(queued);
      } else if (this.character().autoAttackEnabled) {
        this.executePlayerCombatMove({
          type: 'ATTACK',
          rawInput: 'attack',
          source: 'HUD',
          targetId: this.selectedTargetId() ?? monsters[0].id,
        });
      }
    }

    // Advance Monster ATB bars and execute enemy attacks
    const currentRoomId = this.character().currentRoomId;
    this.rooms.update((allRooms) =>
      allRooms.map((room) => {
        if (room.id !== currentRoomId) return room;
        const updatedMonsters = room.monsters.map((mob) => {
          if (mob.hp <= 0) return mob;
          const isChilled = mob.statuses.some((s) => s.tag === 'Chill');
          const fillStep = mob.speed * 0.28 * (isChilled ? 0.6 : 1);
          const nextMobAtb = mob.atbGauge + fillStep;

          // Periodic Burn tick every 10 ticks (1s)
          let burnDmg = 0;
          if (this.tickCounter % 10 === 0 && mob.statuses.some((s) => s.tag === 'Burn')) {
            burnDmg = 5;
          }

          // Decay monster statuses
          const nextStatuses = mob.statuses
            .map((s) => ({ ...s, remainingMs: s.remainingMs - 100 }))
            .filter((s) => s.remainingMs > 0);

          if (nextMobAtb >= 100) {
            this.executeMonsterCounterAttack(mob);
            return {
              ...mob,
              hp: Math.max(0, mob.hp - burnDmg),
              atbGauge: 0,
              statuses: nextStatuses,
            };
          }

          return {
            ...mob,
            hp: Math.max(0, mob.hp - burnDmg),
            atbGauge: Math.min(100, nextMobAtb),
            statuses: nextStatuses,
          };
        });

        return { ...room, monsters: updatedMonsters };
      }),
    );
  }

  /**
   * Dual-Input Parity Dispatcher:
   * Both terminal text commands (`cast sunder goblin`) and HUD button clicks dispatch `CommandIntent`.
   * When dispatched from the tactile HUD (`source === 'HUD'`), attaches a `[cmd: ...]` syntax echo
   * to the next log line so players organically learn power-user commands.
   */
  dispatchCommandIntent(intent: CommandIntent): void {
    if (intent.source === 'HUD' && intent.rawInput) {
      this.pendingSyntaxEcho = `[cmd: ${intent.rawInput}]`;
    } else {
      this.pendingSyntaxEcho = undefined;
    }
    switch (intent.type) {
      case 'MOVE':
        if (intent.direction) {
          this.moveDirection(intent.direction);
        }
        break;
      case 'LOOK':
        this.emitCurrentRoomNarrative();
        break;
      case 'INSPECT':
        this.inspectTarget(intent.targetId);
        break;
      case 'ATTACK':
      case 'CAST_SKILL':
        if (!this.inActiveCombat()) {
          this.appendFeed('SYSTEM', 'No hostile targets remain in this sector.');
          return;
        }
        if (this.character().atbGauge >= 100) {
          this.executePlayerCombatMove(intent);
        } else {
          this.queuedSkillIntent.set(intent);
          this.appendFeed(
            'COMBAT',
            `[ATB Queue] Queued ${intent.skillKey ? intent.skillKey.toUpperCase() : 'AUTO-STRIKE'} (${Math.round(this.character().atbGauge)}% ready).`,
          );
        }
        break;
      case 'TAKE_ITEM':
        this.takeRoomItem(intent.targetId);
        break;
      case 'EQUIP_ITEM':
        if (intent.targetId) {
          this.equipInventoryItem(intent.targetId);
        }
        break;
      case 'REST_CAMPFIRE':
        this.restAtCampfire();
        break;
      case 'ENTER_PORTAL':
        if (intent.targetId) {
          this.traverseChaosGatePortal(intent.targetId);
        }
        break;
      case 'MOO_DIG':
        this.handleMooDig(intent.payload ?? {});
        break;
      case 'MOO_DESCRIBE':
        this.handleMooDescribe(intent.payload ?? {});
        break;
      case 'MOO_CRAFT':
        this.handleMooCraft(intent.payload ?? {});
        break;
      case 'MOO_TRIGGER':
        this.handleMooTrigger(intent.payload ?? {});
        break;
      case 'MOO_LEGEND':
        this.handleMooLegend(intent.payload ?? {});
        break;
      case 'PRUNE_ROOM':
        this.pruneRoom(intent.targetId);
        break;
      case 'BARTER_ECHO':
        if (intent.targetId && intent.payload?.['itemId']) {
          this.barterEcho(intent.targetId, intent.payload['itemId']);
        }
        break;
      case 'CHAT_MESSAGE':
        if (intent.payload?.['text']) {
          const channel = intent.payload['channel'] === 'ROOM' ? 'ROOM' : 'SHOUT';
          this.broadcastChatMessage(channel, intent.payload['text']);
        }
        break;
    }
  }

  /**
   * Parse natural MUD/MOO terminal strings into strongly-typed CommandIntent payloads
   * ensuring 100% parity with HUD actions.
   */
  parseAndDispatchTerminalInput(rawInput: string): CommandIntent | null {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    this.appendFeed('SYSTEM', `> ${trimmed}`);
    const lower = trimmed.toLowerCase();
    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();

    // Direction shortcuts
    const dirMap: Record<string, ExitDirection> = {
      n: 'N',
      north: 'N',
      s: 'S',
      south: 'S',
      e: 'E',
      east: 'E',
      w: 'W',
      west: 'W',
      u: 'U',
      up: 'U',
      d: 'D',
      down: 'D',
    };
    if (dirMap[lower]) {
      const intent: CommandIntent = {
        type: 'MOVE',
        rawInput: trimmed,
        source: 'TERMINAL',
        direction: dirMap[lower],
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'go' && parts[1] && dirMap[parts[1].toLowerCase()]) {
      const intent: CommandIntent = {
        type: 'MOVE',
        rawInput: trimmed,
        source: 'TERMINAL',
        direction: dirMap[parts[1].toLowerCase()],
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'look' || verb === 'l') {
      const intent: CommandIntent = { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'rest' || verb === 'camp') {
      const intent: CommandIntent = {
        type: 'REST_CAMPFIRE',
        rawInput: trimmed,
        source: 'TERMINAL',
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'inspect' || verb === 'scan' || verb === 'examine') {
      const query = parts.slice(1).join(' ').toLowerCase();
      const targetId = this.resolveTargetIdByQuery(query);
      const intent: CommandIntent = {
        type: 'INSPECT',
        rawInput: trimmed,
        source: 'TERMINAL',
        targetId,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'take' || verb === 'get' || verb === 'loot') {
      const query = parts.slice(1).join(' ').toLowerCase();
      const room = this.currentRoom();
      const matchedItem =
        room.items.find((it) => it.name.toLowerCase().includes(query)) ?? room.items[0];
      const intent: CommandIntent = {
        type: 'TAKE_ITEM',
        rawInput: trimmed,
        source: 'TERMINAL',
        targetId: matchedItem?.id,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'attack' || verb === 'hit' || verb === 'kill') {
      const query = parts.slice(1).join(' ').toLowerCase();
      const targetId = this.resolveMonsterTargetByQuery(query);
      const intent: CommandIntent = {
        type: 'ATTACK',
        rawInput: trimmed,
        source: 'TERMINAL',
        targetId,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'cast' || verb === 'use' || verb === 'skill') {
      const skillKey = (parts[1] ?? 'sunder').toLowerCase();
      const targetQuery = parts.slice(2).join(' ').toLowerCase();
      const targetId = this.resolveMonsterTargetByQuery(targetQuery);
      const intent: CommandIntent = {
        type: 'CAST_SKILL',
        rawInput: trimmed,
        source: 'TERMINAL',
        skillKey,
        targetId,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'portal' || verb === 'gate') {
      const addressStr = parts.slice(1).join(' ');
      const intent: CommandIntent = {
        type: 'ENTER_PORTAL',
        rawInput: trimmed,
        source: 'TERMINAL',
        targetId: addressStr,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    // MOO Architect Commands: @dig, @describe, @craft, @trigger, @legend
    if (verb === '@dig') {
      // Syntax: @dig <Direction> <Room Title>
      const dirRaw = (parts[1] ?? 'E').toUpperCase() as ExitDirection;
      const validDir: ExitDirection = ['N', 'S', 'E', 'W', 'U', 'D'].includes(dirRaw)
        ? dirRaw
        : 'E';
      const title = parts.slice(2).join(' ') || 'Excavated Relay Chamber';
      const intent: CommandIntent = {
        type: 'MOO_DIG',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { direction: validDir, title },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === '@describe') {
      const description = parts.slice(1).join(' ') || 'Architect-inscribed chamber walls.';
      const intent: CommandIntent = {
        type: 'MOO_DESCRIBE',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { roomId: this.currentRoom().id, description },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === '@craft') {
      // Syntax: @craft <Slot> <Name>
      const slotArg = parts[1] ?? 'Main-Hand';
      const nameArg = parts.slice(2).join(' ') || 'Architect Relic Blade';
      const intent: CommandIntent = {
        type: 'MOO_CRAFT',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { slot: slotArg, name: nameArg },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === '@trigger') {
      // Syntax: @trigger <WHEN> <IF> <DO> <PAYLOAD>
      const when = parts[1] ?? 'ON_ENTER';
      const ifCond = parts[2] ?? 'PER>=12';
      const doAct = parts[3] ?? 'EMIT_LORE';
      const actPayload = parts.slice(4).join(' ') || 'Hidden resonance unlocked!';
      const intent: CommandIntent = {
        type: 'MOO_TRIGGER',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { when, ifCondition: ifCond, doAction: doAct, actionPayload: actPayload },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === '@legend') {
      // Syntax: @legend <Glyph> <ColorHex> <Label>
      const glyph = parts[1] ?? '✦';
      const colorHex = parts[2]?.startsWith('#') ? parts[2] : '#f472b6';
      const label = parts.slice(3).join(' ') || 'Custom Resonance Shrine';
      const intent: CommandIntent = {
        type: 'MOO_LEGEND',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { glyph, colorHex, label },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === '@prune' || verb === 'prune') {
      const intent: CommandIntent = {
        type: 'PRUNE_ROOM',
        rawInput: trimmed,
        source: 'TERMINAL',
        targetId: parts[1] || this.currentRoom().id,
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    // P2P Broadcast Chat: say / ' (room) and shout / chat / broadcast (realm-wide)
    if (verb === 'say' || verb === '@say' || lower.startsWith("'")) {
      const msg = lower.startsWith("'")
        ? trimmed.substring(1).trim()
        : parts.slice(1).join(' ').trim();
      if (!msg) {
        this.appendFeed('SYSTEM', "Say what? Syntax: say <message> or '<message>");
        return null;
      }
      const intent: CommandIntent = {
        type: 'CHAT_MESSAGE',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { channel: 'ROOM', text: msg },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (
      verb === 'shout' ||
      verb === 'yell' ||
      verb === 'chat' ||
      verb === '@chat' ||
      verb === '@shout' ||
      verb === 'broadcast'
    ) {
      const msg = parts.slice(1).join(' ').trim();
      if (!msg) {
        this.appendFeed('SYSTEM', 'Broadcast what? Syntax: shout <message> or chat <message>');
        return null;
      }
      const intent: CommandIntent = {
        type: 'CHAT_MESSAGE',
        rawInput: trimmed,
        source: 'TERMINAL',
        payload: { channel: 'SHOUT', text: msg },
      };
      this.dispatchCommandIntent(intent);
      return intent;
    }

    if (verb === 'who' || verb === '@who' || verb === 'players' || verb === 'adventurers') {
      this.listAdventurersInRealm();
      return { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
    }

    if (verb === '@greeting' || verb === '@motto' || verb === '@herald' || verb === 'motto') {
      const rest = parts.slice(1).join(' ').trim();
      if (!rest) {
        const cur = this.character().heraldGreeting?.formatted;
        this.appendFeed(
          'SYSTEM',
          `📜 Current Herald Motto: "${cur}". Commands: @greeting roll, or @greeting <tmplId> <adjective> <noun> [verb]`,
        );
        return { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
      }
      if (rest.toLowerCase() === 'roll' || rest.toLowerCase() === 'random') {
        this.rollRandomHeraldGreeting();
        return { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
      }

      let tmplId = 0;
      let adj: string = HERALD_ADJECTIVES[0];
      let noun: string = HERALD_NOUNS[0];
      let verbWord: string = HERALD_VERBS[0];

      const subParts = rest.split(/\s+/);
      let offset = 0;
      if (!isNaN(parseInt(subParts[0], 10))) {
        tmplId = parseInt(subParts[0], 10);
        offset = 1;
      }
      if (subParts[offset]) {
        const foundAdj = HERALD_ADJECTIVES.find(
          (a) => a.toLowerCase() === subParts[offset].toLowerCase(),
        );
        if (foundAdj) adj = foundAdj;
      }
      if (subParts[offset + 1]) {
        const foundNoun = HERALD_NOUNS.find(
          (n) => n.toLowerCase() === subParts[offset + 1].toLowerCase(),
        );
        if (foundNoun) noun = foundNoun;
      }
      if (subParts[offset + 2]) {
        const foundVerb = HERALD_VERBS.find(
          (v) => v.toLowerCase() === subParts[offset + 2].toLowerCase(),
        );
        if (foundVerb) verbWord = foundVerb;
      }
      this.setHeraldGreeting(tmplId, adj, noun, verbWord);
      return { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
    }

    if (verb === 'map' || verb === '@map' || verb === 'observatory') {
      this.appendFeed(
        'SYSTEM',
        '🗺 [Observatory Graph] God’s-Eye topological cartography toggled. Press [M] or click [⤢ Expand / ✕ Return] to switch views.',
      );
      return { type: 'LOOK', rawInput: trimmed, source: 'TERMINAL' };
    }

    this.appendFeed(
      'SYSTEM',
      `Unrecognized command "${verb}". Try: say <msg>, shout <msg>, who, look, n/s/e/w, cast sunder <target>, inspect, rest, @prune.`,
    );
    return null;
  }

  private resolveMonsterTargetByQuery(query: string): string | undefined {
    const monsters = this.livingRoomMonsters();
    if (monsters.length === 0) return undefined;
    if (!query) return this.selectedTargetId() ?? monsters[0].id;
    const matched = monsters.find(
      (m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase() === query,
    );
    return matched?.id ?? monsters[0].id;
  }

  private resolveTargetIdByQuery(query: string): string | undefined {
    const room = this.currentRoom();
    if (!query) {
      return room.monsters[0]?.id ?? room.items[0]?.id ?? room.id;
    }
    const mob = room.monsters.find(
      (m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase() === query,
    );
    if (mob) return mob.id;
    const item = room.items.find(
      (i) => i.name.toLowerCase().includes(query) || i.id.toLowerCase() === query,
    );
    if (item) return item.id;
    return room.id;
  }

  private executePlayerCombatMove(intent: CommandIntent): void {
    const monsters = this.livingRoomMonsters();
    if (monsters.length === 0) return;

    const target =
      monsters.find((m) => m.id === intent.targetId) ??
      monsters.find((m) => m.id === this.selectedTargetId()) ??
      monsters[0];

    const char = this.character();
    const stats = this.derivedStats();
    const room = this.currentRoom();

    let usedSkill: SkillSlot | undefined;
    if (intent.type === 'CAST_SKILL' && intent.skillKey) {
      usedSkill = char.activeSkills.find(
        (s) =>
          s.commandKey.toLowerCase() === intent.skillKey?.toLowerCase() ||
          s.id.toLowerCase() === intent.skillKey?.toLowerCase() ||
          s.name.toLowerCase().includes(intent.skillKey?.toLowerCase() ?? ''),
      );
      if (usedSkill && usedSkill.currentCooldownMs > 0) {
        this.appendFeed('COMBAT', `${usedSkill.name} is still cooling down!`);
        return;
      }
      if (usedSkill && char.stamina < usedSkill.staminaCost) {
        this.appendFeed('COMBAT', `Insufficient Stamina for ${usedSkill.name}!`);
        return;
      }
    }

    const skillName = usedSkill ? usedSkill.name : 'Auto-Strike';
    const skillId = usedSkill ? usedSkill.id : 'basic-attack';
    const element = usedSkill ? usedSkill.element : 'Physical';
    const mult = usedSkill ? usedSkill.powerMultiplier : 1.0;

    // RNG 1-100 roll
    const roll = Math.max(1, Math.min(100, Math.floor(this.combatRng() * 100) + 1));
    const isMiss = roll <= 6;
    const isCrit = !isMiss && roll >= 100 - stats.critChancePct;

    // Check Elemental + Atmosphere Mutator & Status Combo
    let comboMult = 1.0;
    let comboText = '';
    if (usedSkill?.comboTriggerStatus) {
      const hasTrigger = target.statuses.some((s) => s.tag === usedSkill.comboTriggerStatus);
      if (hasTrigger) {
        comboMult *= 1.4;
        comboText += ` [COMBO: ${usedSkill.comboTriggerStatus} Detonation +40%]`;
      }
    }
    if (element === room.elementalMutator) {
      comboMult *= 1.15;
      comboText += ` [Atmosphere Resonance: ${element} +15%]`;
    }
    if (element === target.weakness) {
      comboMult *= 1.25;
      comboText += ` [Weakness Exploited: ${element} +25%]`;
    }

    const targetSundered = target.statuses.some((s) => s.tag === 'Sunder');
    const effectiveMitPct = Math.max(0, target.mitigationPct - (targetSundered ? 20 : 0));

    let rawDmg = Math.round(stats.atk * mult * comboMult * (isCrit ? stats.critMultiplier : 1));
    if (isMiss) rawDmg = 0;

    const mitigated = Math.round(rawDmg * (effectiveMitPct / 100));
    const finalDmg = Math.max(isMiss ? 0 : 1, rawDmg - mitigated);
    const overkill = Math.max(0, finalDmg - target.hp);
    const healingDone =
      usedSkill?.id === 'sk-aegis-pulse' || usedSkill?.id === 'sk-soul-reap' ? 15 : 0;

    // Consume ATB, stamina, and set skill cooldown
    this.character.update((c) => ({
      ...c,
      atbGauge: 0,
      hp: Math.min(stats.maxHp, c.hp + healingDone),
      stamina: Math.max(0, c.stamina - (usedSkill?.staminaCost ?? 0)),
      activeSkills: c.activeSkills.map((s) =>
        s.id === usedSkill?.id ? { ...s, currentCooldownMs: s.cooldownMs } : s,
      ),
    }));

    // Update Monster HP & Statuses
    let monsterDefeated = false;
    this.rooms.update((all) =>
      all.map((r) => {
        if (r.id !== room.id) return r;
        const nextMonsters = r.monsters.map((m) => {
          if (m.id !== target.id) return m;
          const nextHp = Math.max(0, m.hp - finalDmg);
          if (nextHp === 0 && m.hp > 0) {
            monsterDefeated = true;
          }
          const nextStatuses: ActiveStatusEffect[] = [...m.statuses];
          if (!isMiss && usedSkill?.statusApplied) {
            const existingIdx = nextStatuses.findIndex((s) => s.tag === usedSkill.statusApplied);
            if (existingIdx >= 0) {
              nextStatuses[existingIdx] = {
                ...nextStatuses[existingIdx],
                remainingMs: 6000,
                stacks: nextStatuses[existingIdx].stacks + 1,
              };
            } else {
              nextStatuses.push({
                tag: usedSkill.statusApplied,
                remainingMs: 6000,
                stacks: 1,
                sourceId: char.id,
              });
            }
          }
          return { ...m, hp: nextHp, statuses: nextStatuses };
        });
        return { ...r, monsters: nextMonsters };
      }),
    );

    const outcome = isMiss ? 'MISS' : isCrit ? 'CRIT' : 'HIT';
    const line = isMiss
      ? `${char.name}'s ${skillName} missed ${target.name} (Roll ${roll}).`
      : `${char.name} executes [${skillName}] on ${target.name} for ${finalDmg} ${element} DMG (${outcome} Roll ${roll}, ${mitigated} mitigated)${comboText}!`;

    this.appendFeed('COMBAT', line);
    this.recordReplayFrame(char.name, line);

    // Record Telemetry Sample
    this.telemetry.update((t) => ({
      ...t,
      combatSamples: [
        ...t.combatSamples,
        {
          timestampMs: Date.now(),
          actorId: char.id,
          actorName: char.name,
          targetName: target.name,
          skillId,
          skillName,
          element,
          rollValue: roll,
          outcome,
          damageDealt: finalDmg,
          damageMitigated: mitigated,
          overkill,
          healingDone,
          statusApplied: usedSkill?.statusApplied,
        },
      ],
    }));

    // Broadcast Co-op Combat Intent over P2P
    this.transport.broadcastCombatIntent(
      char.name,
      this.activeGateAddress().formatted,
      room.id,
      intent,
    );

    if (monsterDefeated) {
      void this.onMonsterDefeated(target);
    }
  }

  private executeMonsterCounterAttack(mob: MonsterEntity): void {
    const char = this.character();
    const stats = this.derivedStats();
    const roll = Math.max(1, Math.min(100, Math.floor(this.combatRng() * 100) + 1));
    const isMiss = roll <= 10;
    const raw = isMiss ? 0 : mob.atk;
    const mitigated = Math.round(raw * (stats.mitigationPct / 100));
    const dmg = Math.max(isMiss ? 0 : 1, raw - mitigated);

    const nextHp = Math.max(0, char.hp - dmg);
    this.character.update((c) => ({ ...c, hp: nextHp }));

    const line = isMiss
      ? `${mob.name} lunges at ${char.name} but misses (Roll ${roll}).`
      : `${mob.name} strikes ${char.name} for ${dmg} ${mob.element} DMG (${mitigated} mitigated, Roll ${roll}).`;

    this.appendFeed('COMBAT', line);
    this.recordReplayFrame(mob.name, line);

    this.telemetry.update((t) => ({
      ...t,
      combatSamples: [
        ...t.combatSamples,
        {
          timestampMs: Date.now(),
          actorId: mob.id,
          actorName: mob.name,
          targetName: char.name,
          skillId: 'enemy-strike',
          skillName: `${mob.name} Strike`,
          element: mob.element,
          rollValue: roll,
          outcome: isMiss ? 'MISS' : 'HIT',
          damageDealt: dmg,
          damageMitigated: mitigated,
          overkill: 0,
          healingDone: 0,
        },
      ],
    }));

    if (nextHp <= 0) {
      this.handlePlayerWipe(mob);
    }
  }

  private async onMonsterDefeated(mob: MonsterEntity): Promise<void> {
    const xpGain = mob.isBoss ? 120 : 35;
    const goldGain = mob.isBoss ? 85 : 20;

    this.character.update((c) => {
      const totalXp = c.xp + xpGain;
      const newLevel = Math.max(c.level, 1 + Math.floor(totalXp / 100));
      const prevEntry = c.bestiaryUnlocked[mob.templateId] ?? { kills: 0, inspectedLevel: 0 };
      return {
        ...c,
        xp: totalXp,
        level: newLevel,
        gold: c.gold + goldGain,
        bestiaryUnlocked: {
          ...c.bestiaryUnlocked,
          [mob.templateId]: {
            kills: prevEntry.kills + 1,
            inspectedLevel: Math.max(prevEntry.inspectedLevel, 1),
          },
        },
      };
    });

    this.appendFeed(
      'COMBAT',
      `★ ${mob.name} defeated! Earned +${xpGain} XP and +${goldGain} Gold.`,
    );

    // If Boss defeated, sign Verified Drop with SubtleCrypto ECDSA and log Chronicle + Guestbook
    if (mob.isBoss && mob.lootTable.length > 0) {
      const signedDrop = await this.storage.signVerifiedDrop(mob.lootTable[0]);
      const roomId = this.currentRoom().id;
      this.rooms.update((all) =>
        all.map((r) => (r.id === roomId ? { ...r, items: [...r.items, signedDrop] } : r)),
      );
      this.appendFeed(
        'LORE',
        `◈ REALM BOSS CONQUERED! SubtleCrypto ECDSA Verified Drop materialized: [${signedDrop.name}] (Sig: ${signedDrop.signatureHex?.slice(0, 14)}...)`,
        [
          {
            label: `Take ${signedDrop.name}`,
            targetId: signedDrop.id,
            actionType: 'TAKE_ITEM',
            colorHex: '#fbbf24',
          },
        ],
      );

      this.recordBossClearChronicle(xpGain, goldGain);
    }

    await this.storage.saveCharacterState(this.character());
    await this.storage.saveTelemetryLog(this.telemetry());
  }

  private recordBossClearChronicle(xpEarned: number, goldEarned: number): void {
    const char = this.character();
    const addr = this.activeGateAddress();
    const room = this.currentRoom();

    const guestEntry: GuestbookGravestoneEntry = {
      id: `gb-${Date.now()}`,
      visitorName: char.name,
      archetype: char.archetype,
      timestampIso: new Date().toISOString(),
      outcome: 'BOSS_CLEARED',
      roomId: room.id,
      roomTitle: room.title,
      epitaphOrNote: `Conquered the Sanctum of ${addr.formatted} at Level ${char.level}.`,
      replayFrames: [...this.currentRunReplayFrames],
    };

    this.telemetry.update((t) => {
      const lastCareer = t.careerChronicle[t.careerChronicle.length - 1];
      const cumXp = (lastCareer?.cumulativeXp ?? 100) + xpEarned;
      const cumGold = (lastCareer?.cumulativeGold ?? 50) + goldEarned;
      return {
        ...t,
        guestbook: [guestEntry, ...t.guestbook],
        careerChronicle: [
          ...t.careerChronicle,
          {
            id: `chron-${Date.now()}`,
            timestampIso: new Date().toISOString(),
            gateAddress: addr.formatted,
            era: addr.era,
            eventTitle: `Conquered ${addr.formatted}`,
            conquered: true,
            xpEarned,
            goldEarned,
            cumulativeXp: cumXp,
            cumulativeGold: cumGold,
          },
        ],
      };
    });

    this.transport.broadcastGravestone(char.name, addr.formatted, room.id, guestEntry);
  }

  private handlePlayerWipe(killer: MonsterEntity): void {
    const char = this.character();
    const room = this.currentRoom();
    const addr = this.activeGateAddress();
    const stats = this.derivedStats();

    const gravestone: GuestbookGravestoneEntry = {
      id: `grave-${Date.now()}`,
      visitorName: char.name,
      archetype: char.archetype,
      timestampIso: new Date().toISOString(),
      outcome: 'PARTY_WIPED',
      roomId: room.id,
      roomTitle: room.title,
      epitaphOrNote: `Fell in battle against ${killer.name} inside ${room.title}.`,
      replayFrames: [...this.currentRunReplayFrames],
    };

    this.telemetry.update((t) => {
      const prevMetric = t.roomMetrics[room.id] ?? {
        roomId: room.id,
        visitorCount: 1,
        playerDeaths: 0,
        totalTimeSpentMs: 1000,
        lootExtractedCount: 0,
      };
      return {
        ...t,
        roomMetrics: {
          ...t.roomMetrics,
          [room.id]: {
            ...prevMetric,
            playerDeaths: prevMetric.playerDeaths + 1,
          },
        },
        guestbook: [gravestone, ...t.guestbook],
      };
    });

    this.transport.broadcastGravestone(char.name, addr.formatted, room.id, gravestone);

    // Respawn player at Anchor Portal (room-0)
    this.character.update((c) => ({
      ...c,
      currentRoomId: 'room-0',
      hp: stats.maxHp,
      stamina: stats.maxStamina,
      atbGauge: 0,
    }));

    this.appendFeed(
      'COMBAT',
      `☠ Critical Failure! ${char.name} fell to ${killer.name}. A Gravestone chronicle was etched into [${room.title}]. Emergency reconstruction completed at Anchor Portal.`,
    );
    this.emitCurrentRoomNarrative();
  }

  private recordReplayFrame(actorName: string, narrativeLine: string): void {
    const char = this.character();
    const stats = this.derivedStats();
    const mob = this.livingRoomMonsters()[0];
    const frame: ReplayFrame = {
      tickIndex: this.tickCounter,
      timestampOffsetMs: this.tickCounter * 100,
      roomId: char.currentRoomId,
      actorName,
      narrativeLine,
      playerHpPct: Math.round((char.hp / Math.max(1, stats.maxHp)) * 100),
      enemyHpPct: mob ? Math.round((mob.hp / Math.max(1, mob.maxHp)) * 100) : 0,
    };
    this.currentRunReplayFrames.push(frame);
    if (this.currentRunReplayFrames.length > 60) {
      this.currentRunReplayFrames.shift();
    }
  }

  turnLeft(): void {
    const leftMap: Record<CompassDirection, CompassDirection> = {
      N: 'W',
      W: 'S',
      S: 'E',
      E: 'N',
    };
    this.playerFacing.update((f) => leftMap[f]);
    this.appendFeed('SYSTEM', `Turned left. Facing ${this.playerFacing()}.`);
  }

  turnRight(): void {
    const rightMap: Record<CompassDirection, CompassDirection> = {
      N: 'E',
      E: 'S',
      S: 'W',
      W: 'N',
    };
    this.playerFacing.update((f) => rightMap[f]);
    this.appendFeed('SYSTEM', `Turned right. Facing ${this.playerFacing()}.`);
  }

  turnAround(): void {
    const oppMap: Record<CompassDirection, CompassDirection> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
    };
    this.playerFacing.update((f) => oppMap[f]);
    this.appendFeed('SYSTEM', `Turned around. Facing ${this.playerFacing()}.`);
  }

  stepForward(): void {
    const facing = this.playerFacing();
    this.dispatchCommandIntent({
      type: 'MOVE',
      direction: facing,
      source: 'HUD',
      rawInput: facing.toLowerCase(),
    });
  }

  stepBack(): void {
    const oppMap: Record<CompassDirection, CompassDirection> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
    };
    const backDir = oppMap[this.playerFacing()];
    this.dispatchCommandIntent({
      type: 'MOVE',
      direction: backDir,
      source: 'HUD',
      rawInput: backDir.toLowerCase(),
    });
  }

  setFacing(dir: CompassDirection): void {
    this.playerFacing.set(dir);
  }

  moveDirection(direction: ExitDirection): void {
    if (['N', 'S', 'E', 'W'].includes(direction)) {
      this.playerFacing.set(direction as CompassDirection);
    }
    const room = this.currentRoom();
    const exit = room.exits.find((e) => e.direction === direction);
    if (!exit) {
      this.appendFeed('NARRATIVE', `No passage leads ${direction} from ${room.title}.`);
      return;
    }
    if (exit.isLocked) {
      this.appendFeed(
        'NARRATIVE',
        `The ${direction} passage to ${exit.targetRoomId} is sealed by a mechanism. Inspect the room to trigger its release.`,
      );
      return;
    }
    this.moveToRoom(exit.targetRoomId);
  }

  moveToRoom(targetRoomId: string): void {
    const prevRoomId = this.character().currentRoomId;
    const elapsedMs = Math.max(500, Date.now() - this.roomEnteredAtMs);
    this.roomEnteredAtMs = Date.now();

    // Update room telemetry metrics
    this.telemetry.update((t) => {
      const prevStats = t.roomMetrics[prevRoomId] ?? {
        roomId: prevRoomId,
        visitorCount: 1,
        playerDeaths: 0,
        totalTimeSpentMs: 0,
        lootExtractedCount: 0,
      };
      const destStats = t.roomMetrics[targetRoomId] ?? {
        roomId: targetRoomId,
        visitorCount: 0,
        playerDeaths: 0,
        totalTimeSpentMs: 0,
        lootExtractedCount: 0,
      };
      return {
        ...t,
        roomMetrics: {
          ...t.roomMetrics,
          [prevRoomId]: {
            ...prevStats,
            totalTimeSpentMs: prevStats.totalTimeSpentMs + elapsedMs,
          },
          [targetRoomId]: {
            ...destStats,
            visitorCount: destStats.visitorCount + 1,
          },
        },
      };
    });

    this.character.update((c) => ({
      ...c,
      currentRoomId: targetRoomId,
      visitedRoomIds: c.visitedRoomIds.includes(targetRoomId)
        ? c.visitedRoomIds
        : [...c.visitedRoomIds, targetRoomId],
    }));

    this.selectedArchitectRoomId.set(targetRoomId);
    this.evaluateDeclarativeTriggers('ON_ENTER');
    this.emitCurrentRoomNarrative();
    void this.storage.saveCharacterState(this.character());
  }

  private evaluateDeclarativeTriggers(whenEvent: DeclarativeTrigger['when']): void {
    const room = this.currentRoom();
    const attr = this.effectiveAttributes();
    const stats = this.derivedStats();

    for (const trig of room.triggers) {
      if (trig.when !== whenEvent) continue;

      let conditionMet = true;
      if (trig.ifCondition.includes('PER')) {
        const threshold = parseInt(trig.ifCondition.replace(/[^0-9]/g, ''), 10) || 10;
        conditionMet = attr.PER >= threshold;
      }

      if (!conditionMet) {
        this.appendFeed(
          'LORE',
          `[Trigger Condition Unmet] Requires ${trig.ifCondition} (Current PER: ${attr.PER}).`,
        );
        continue;
      }

      if (trig.doAction === 'DEAL_HAZARD') {
        const [hazardName, dmgStr] = trig.actionPayload.split(':');
        const dmg = parseInt(dmgStr, 10) || 10;
        this.character.update((c) => ({ ...c, hp: Math.max(1, c.hp - dmg) }));
        this.appendFeed(
          'COMBAT',
          `▲ [Hazard Triggered] ${hazardName || 'Environmental Trap'} inflicts ${dmg} DMG!`,
        );
      } else if (trig.doAction === 'UNLOCK_EXIT') {
        this.rooms.update((all) =>
          all.map((r) =>
            r.id === room.id
              ? {
                  ...r,
                  exits: r.exits.map((ex) => ({ ...ex, isSecret: false, isLocked: false })),
                }
              : r,
          ),
        );
        this.appendFeed(
          'LORE',
          `⚙ [Trigger Activated] ${trig.ifCondition} verified! Hidden locks disengage toward ${trig.actionPayload}.`,
        );
      } else if (trig.doAction === 'HEAL_PARTY') {
        this.character.update((c) => ({ ...c, hp: stats.maxHp, stamina: stats.maxStamina }));
        this.appendFeed('LORE', `♨ [Trigger Activated] Sanctuary resonance restores full vitals.`);
      } else if (trig.doAction === 'EMIT_LORE') {
        this.appendFeed('LORE', `▤ [Archive Trigger] ${trig.actionPayload}`);
      }
    }
  }

  /**
   * Inspector Lens: Information revealed is gated by the player's PER (Perception) stat
   * and historical Bestiary encounter count.
   */
  inspectTarget(targetId?: string): void {
    const room = this.currentRoom();
    const attr = this.effectiveAttributes();
    const char = this.character();

    this.evaluateDeclarativeTriggers('ON_INSPECT');

    const mob = room.monsters.find((m) => m.id === targetId) ?? room.monsters[0];
    if (mob && (!targetId || targetId === mob.id)) {
      const bestiaryRecord = char.bestiaryUnlocked[mob.templateId] ?? {
        kills: 0,
        inspectedLevel: 0,
      };
      const canSeeWeakness = attr.PER >= 12 || bestiaryRecord.kills >= 1;
      const details = [
        `Level ${mob.level} • Element: ${mob.element} • HP: ${mob.hp}/${mob.maxHp}`,
        `ATK: ${mob.atk} • Mitigation: ${mob.mitigationPct}% • Speed: ${mob.speed}`,
        mob.loreSnippet,
        canSeeWeakness
          ? `Weakness Unlocked (PER ${attr.PER} / Bestiary Kills: ${bestiaryRecord.kills}): Vulnerable to ${mob.weakness}. ${mob.secretWeaknessHint}`
          : `Weakness Redacted: Requires PER >= 12 (Current: ${attr.PER}) or 1 Bestiary defeat to decode structural weakness.`,
      ];

      this.inspectedEntity.set({
        type: 'MONSTER',
        title: mob.name,
        subtitle: `${mob.isBoss ? 'Realm Boss' : 'Hostile Construct'} • ${this.activeGateAddress().formatted}`,
        details,
        secretRevealed: canSeeWeakness,
        requiredPer: 12,
      });

      this.appendFeed('LORE', `[Inspector Lens: ${mob.name}] ${details.join(' | ')}`);
      return;
    }

    const item = room.items.find((i) => i.id === targetId);
    if (item) {
      const details = [
        `Slot: ${item.slot} • Rarity: ${item.rarity} • Provenance: ${item.provenance}`,
        `Stat Budget: ${item.totalStatBudget} (Origin: ${item.originGateAddress})`,
        item.signatureHex
          ? `ECDSA Signature: ${item.signatureHex.slice(0, 24)}...`
          : 'Unsigned Architect Item',
      ];
      this.inspectedEntity.set({
        type: 'ITEM',
        title: item.name,
        subtitle: `${item.provenance} Relic`,
        details,
        secretRevealed: true,
        requiredPer: 8,
      });
      this.appendFeed('LORE', `[Inspector Lens: ${item.name}] ${details.join(' | ')}`);
      return;
    }

    // Inspect Room
    const secretExits = room.exits.filter((e) => e.isSecret);
    const revealedSecrets = attr.PER >= 12 && secretExits.length > 0;
    const details = [
      room.description,
      `Atmosphere: ${room.atmosphereEffect}`,
      `Mutator Element: ${room.elementalMutator}`,
      revealedSecrets
        ? `PER ${attr.PER} Discovery: Secret passage detected leading ${secretExits.map((e) => e.direction).join(', ')}!`
        : `No anomalous structural seams detected at PER ${attr.PER}.`,
    ];

    this.inspectedEntity.set({
      type: 'ROOM',
      title: room.title,
      subtitle: `Sector Node ${room.id}`,
      details,
      secretRevealed: revealedSecrets,
      requiredPer: 12,
    });
    this.appendFeed('LORE', `[Sector Scan: ${room.title}] ${details.join(' | ')}`);
  }

  takeRoomItem(itemId?: string): void {
    const room = this.currentRoom();
    const targetItem = itemId ? room.items.find((i) => i.id === itemId) : room.items[0];
    if (!targetItem) {
      this.appendFeed('SYSTEM', 'There are no items to collect here.');
      return;
    }

    const ruleset = this.activeRealmDelta().ruleset;
    const processedItem = this.isVisitingExternalRealm()
      ? this.storage.enforceCustomsGateOnItem(targetItem, ruleset)
      : targetItem;

    this.rooms.update((all) =>
      all.map((r) =>
        r.id === room.id ? { ...r, items: r.items.filter((i) => i.id !== targetItem.id) } : r,
      ),
    );

    this.character.update((c) => ({
      ...c,
      inventory: [...c.inventory, processedItem],
    }));

    this.telemetry.update((t) => {
      const m = t.roomMetrics[room.id] ?? {
        roomId: room.id,
        visitorCount: 1,
        playerDeaths: 0,
        totalTimeSpentMs: 1000,
        lootExtractedCount: 0,
      };
      return {
        ...t,
        roomMetrics: {
          ...t.roomMetrics,
          [room.id]: { ...m, lootExtractedCount: m.lootExtractedCount + 1 },
        },
      };
    });

    this.appendFeed(
      'NARRATIVE',
      `Collected [${processedItem.name}] (${processedItem.provenance}) into inventory.`,
    );
    void this.storage.saveCharacterState(this.character());
  }

  takeAndEquipRoomItem(itemId: string): void {
    const room = this.currentRoom();
    const targetItem = room.items.find((i) => i.id === itemId);
    if (!targetItem) return;
    this.pendingSyntaxEcho = `[cmd: take ${targetItem.name.toLowerCase()} && equip ${targetItem.name.toLowerCase()}]`;
    this.takeRoomItem(itemId);
    this.equipInventoryItem(itemId);
  }

  useOrPullRoomMechanisms(): void {
    const room = this.currentRoom();
    this.pendingSyntaxEcho = `[cmd: use ${room.title.toLowerCase()}]`;
    if (room.triggers.length > 0) {
      this.evaluateDeclarativeTriggers('ON_INSPECT');
    } else if (room.legendType === 'safe-campfire') {
      this.restAtCampfire();
    } else {
      this.inspectTarget(room.id);
    }
  }

  completeOnboardingAwakening(
    playerName: string,
    archetype: ArchetypeClass,
    era: ServerEraLetter,
    atmosphere: AtmospherePrefix,
    theme: StructuralTheme,
    biome: BiomeNoun,
    heraldGreeting?: HeraldGreeting,
  ): void {
    const cleanName = playerName.trim() || 'Wayfarer_01';
    this.switchArchetype(archetype);
    this.character.update((c) => ({
      ...c,
      name: cleanName,
      heraldGreeting:
        heraldGreeting ??
        c.heraldGreeting ??
        formatHeraldGreeting(0, 'Radiant', 'Beacon', 'triumph'),
    }));
    this.dialChaosGate(era, atmosphere, theme, biome, false);
    this.needsOnboarding.set(false);
    void this.storage.saveCharacterState(this.character());
  }

  equipInventoryItem(itemId: string): void {
    const char = this.character();
    const idx = char.inventory.findIndex((i) => i.id === itemId);
    if (idx < 0) return;

    const item = char.inventory[idx];
    const currentEquipped = char.paperdoll[item.slot];
    const nextInventory = char.inventory.filter((_, i) => i !== idx);
    if (currentEquipped) {
      nextInventory.push(currentEquipped);
    }

    this.character.update((c) => ({
      ...c,
      paperdoll: {
        ...c.paperdoll,
        [item.slot]: item,
      },
      inventory: nextInventory,
    }));

    this.appendFeed('SYSTEM', `Equipped [${item.name}] in [${item.slot}] slot.`);
    void this.storage.saveCharacterState(this.character());
  }

  unequipSlot(slot: PaperdollSlotType): void {
    const char = this.character();
    const item = char.paperdoll[slot];
    if (!item) return;

    this.character.update((c) => ({
      ...c,
      paperdoll: {
        ...c.paperdoll,
        [slot]: null,
      },
      inventory: [...c.inventory, item],
    }));
    this.appendFeed('SYSTEM', `Unequipped [${item.name}] from [${slot}].`);
  }

  restAtCampfire(): void {
    const stats = this.derivedStats();
    this.character.update((c) => ({
      ...c,
      hp: stats.maxHp,
      stamina: stats.maxStamina,
      statuses: [],
    }));
    this.appendFeed(
      'NARRATIVE',
      '♨ You rest beside the sanctuary embers. HP and Stamina fully restored.',
    );
  }

  switchArchetype(archetype: ArchetypeClass): void {
    const template = ARCHETYPE_CATALOG[archetype];
    this.character.update((c) => ({
      ...c,
      archetype,
      baseAttributes: { ...template.baseAttributes },
      activeSkills: template.skills.map((s) => ({ ...s, currentCooldownMs: 0 })),
      passiveTraits: [...template.passives],
    }));
    const stats = this.derivedStats();
    this.character.update((c) => ({
      ...c,
      hp: stats.maxHp,
      stamina: stats.maxStamina,
    }));
    this.appendFeed(
      'SYSTEM',
      `Switched Class Core to [${archetype}]. Active skill loadout updated.`,
    );
    void this.storage.saveCharacterState(this.character());
  }

  toggleAutoAttack(): void {
    this.character.update((c) => ({ ...c, autoAttackEnabled: !c.autoAttackEnabled }));
  }

  /**
   * Dial a 3-Word Chaos Gate Address or traverse into a discovered P2P Realm
   */
  dialChaosGate(
    era: ServerEraLetter,
    atmosphere: AtmospherePrefix,
    theme: StructuralTheme,
    biome: BiomeNoun,
    asVisitingGuest = false,
    externalDelta?: RealmDelta,
  ): void {
    const newAddr = this.chaosGate.createAddress(era, atmosphere, theme, biome);
    this.activeGateAddress.set(newAddr);
    this.isVisitingExternalRealm.set(asVisitingGuest);

    const delta: RealmDelta = externalDelta ?? {
      gateAddress: newAddr,
      ownerName: asVisitingGuest ? 'Remote Architect' : this.character().name,
      updatedAtIso: new Date().toISOString(),
      ruleset: {
        levelCap: 20,
        maxItemStatBudget: asVisitingGuest ? 12 : 30, // Enforce visible Customs Gate clamping when visiting external realms
        allowArchitectForgedItems: true,
        pvpEnabled: false,
      },
      customLegendEntries: [],
      roomOverrides: {},
      customRoomIds: [],
    };

    if (!asVisitingGuest) {
      this.homeGateAddress.set(newAddr);
    }

    this.activeRealmDelta.set(delta);
    this.legendRegistry.clearCustomEntries();
    this.legendRegistry.mergeHostCustomLegends(delta.customLegendEntries);

    const generatedRooms = this.chaosGate.generateRealm(newAddr, delta);
    this.rooms.set(generatedRooms);

    // Apply Customs Gate ruleset enforcement across equipped Paperdoll & inventory items
    this.applyCustomsGateToCharacter(delta.ruleset);

    this.character.update((c) => ({
      ...c,
      currentRoomId: 'room-0',
      visitedRoomIds: ['room-0'],
      atbGauge: 0,
    }));

    this.selectedArchitectRoomId.set('room-0');
    this.appendFeed(
      'NETWORK',
      `◈ Chaos Gate locked onto [${newAddr.formatted}] (Seed: 0x${newAddr.seed.toString(16).toUpperCase()}). Customs Gate ceiling: ${delta.ruleset.maxItemStatBudget} Stat Budget.`,
    );
    this.emitCurrentRoomNarrative();
    void this.storage.saveRealmDelta(delta);
  }

  traverseChaosGatePortal(addressOrPeerId: string): void {
    const peer =
      this.transport.discoveredPeers()[addressOrPeerId] ??
      Object.values(this.transport.discoveredPeers()).find(
        (p) => p.gateAddress.toLowerCase() === addressOrPeerId.toLowerCase(),
      );

    const addrStr = peer ? peer.gateAddress : addressOrPeerId;
    const parsed = this.chaosGate.parseAddressString(addrStr);
    if (!parsed) {
      this.appendFeed('NETWORK', `Could not lock onto Chaos Gate "${addressOrPeerId}".`);
      return;
    }

    // Add a custom legend entry from the remote host to demonstrate automatic custom legend merging
    const guestDelta: RealmDelta = {
      gateAddress: parsed,
      ownerName: peer?.playerName ?? 'Remote Host',
      updatedAtIso: new Date().toISOString(),
      ruleset: {
        levelCap: 15,
        maxItemStatBudget: 12, // Clamps high-budget items during the visit
        allowArchitectForgedItems: true,
        pvpEnabled: false,
      },
      customLegendEntries: [
        {
          id: 'host-astral-beacon',
          classification: 'custom',
          glyph: '✧',
          label: `${peer?.playerName ?? 'Host'}'s Resonance Well`,
          colorHex: '#f472b6',
          tooltipDescription: 'Custom host legend node merged via Chaos Gate manifest.',
          isCustom: true,
        },
      ],
      roomOverrides: {
        'room-2': {
          roomId: 'room-2',
          legendType: 'custom',
          customLegendId: 'host-astral-beacon',
        },
      },
      customRoomIds: [],
    };

    this.dialChaosGate(parsed.era, parsed.atmosphere, parsed.theme, parsed.biome, true, guestDelta);
  }

  returnToHomeRealm(): void {
    const home = this.homeGateAddress();
    this.dialChaosGate(home.era, home.atmosphere, home.theme, home.biome, false);
  }

  private applyCustomsGateToCharacter(ruleset: RealmDelta['ruleset']): void {
    this.character.update((c) => {
      const nextPaperdoll = { ...c.paperdoll };
      for (const slot of Object.keys(nextPaperdoll) as PaperdollSlotType[]) {
        const item = nextPaperdoll[slot];
        if (item) {
          nextPaperdoll[slot] = this.isVisitingExternalRealm()
            ? this.storage.enforceCustomsGateOnItem(item, ruleset)
            : { ...item, clampedStatBudget: undefined, clampedScaleFactor: 1 };
        }
      }
      const nextInv = c.inventory.map((item) =>
        this.isVisitingExternalRealm()
          ? this.storage.enforceCustomsGateOnItem(item, ruleset)
          : { ...item, clampedStatBudget: undefined, clampedScaleFactor: 1 },
      );
      return {
        ...c,
        paperdoll: nextPaperdoll,
        inventory: nextInv,
      };
    });
  }

  /**
   * MOO / Architect Room & Trigger Editing Operations (Saved to JSON Delta Layer)
   */
  private handleMooDig(payload: Record<string, string>): void {
    const fromRoom = this.currentRoom();
    const dir = (payload['direction'] as ExitDirection) || 'E';
    const title = payload['title'] || 'Architect Excavated Chamber';
    const description =
      payload['description'] ||
      `An Architect-excavated chamber branching ${dir} from ${fromRoom.title}.`;
    const legendType = (payload['legendType'] as CoreLegendType) || 'custom';
    const spawnMonsterName = payload['spawnMonsterName'];
    const spawnLootName = payload['spawnLootName'];
    const spawnTrapName = payload['spawnTrapName'];
    const newRoomId = `room-custom-${Date.now().toString(36).slice(-4)}`;

    const offsetMap: Record<ExitDirection, { dx: number; dy: number; rev: ExitDirection }> = {
      N: { dx: 0, dy: -110, rev: 'S' },
      S: { dx: 0, dy: 110, rev: 'N' },
      E: { dx: 140, dy: 0, rev: 'W' },
      W: { dx: -140, dy: 0, rev: 'E' },
      U: { dx: 80, dy: -90, rev: 'D' },
      D: { dx: -80, dy: 90, rev: 'U' },
    };
    const off = offsetMap[dir] ?? offsetMap.E;
    const newX = Math.max(70, Math.min(890, fromRoom.x + off.dx));
    const newY = Math.max(60, Math.min(520, fromRoom.y + off.dy));

    const customMonsters: MonsterEntity[] = [];
    if (spawnMonsterName && spawnMonsterName !== 'NONE') {
      customMonsters.push({
        id: `mob-${newRoomId}`,
        templateId: spawnMonsterName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: `${this.activeGateAddress().era}-Rank ${spawnMonsterName}`,
        level: this.character().level,
        isBoss: legendType === 'elite-boss',
        hp: legendType === 'elite-boss' ? 160 : 75,
        maxHp: legendType === 'elite-boss' ? 160 : 75,
        atk: legendType === 'elite-boss' ? 20 : 13,
        mitigationPct: 14,
        speed: 12,
        atbGauge: 25,
        element: fromRoom.elementalMutator,
        weakness: 'Fire',
        statuses: [],
        loreSnippet: `Architect-placed ${spawnMonsterName} guarding ${title}.`,
        secretWeaknessHint: 'Vulnerable to Sunder + Elemental burst combos.',
        lootTable: [],
      });
    }

    const customItems: EquipmentItem[] = [];
    if (spawnLootName && spawnLootName !== 'NONE') {
      customItems.push({
        id: `item-${newRoomId}`,
        name: spawnLootName,
        slot: 'Main-Hand',
        rarity: 'Relic',
        weight: 4,
        provenance: 'Architect Forged',
        originGateAddress: this.activeGateAddress().formatted,
        statBonuses: { STR: 4, DEX: 3, atkBonus: 7, speedPctBonus: 4 },
        totalStatBudget: 18,
      });
    }

    const customTriggers: DeclarativeTrigger[] = [];
    if (spawnTrapName && spawnTrapName !== 'NONE') {
      customTriggers.push({
        id: `trig-${newRoomId}`,
        when: 'ON_ENTER',
        ifCondition: 'ALWAYS',
        doAction: 'DEAL_HAZARD',
        actionPayload: `${spawnTrapName}:12`,
      });
    }

    const newRoom: RoomNode = {
      id: newRoomId,
      title,
      description,
      x: newX,
      y: newY,
      depthTier: fromRoom.depthTier + 1,
      legendType,
      atmosphereEffect: fromRoom.atmosphereEffect,
      elementalMutator: fromRoom.elementalMutator,
      exits: [{ direction: off.rev, targetRoomId: fromRoom.id }],
      monsters: customMonsters,
      items: customItems,
      triggers: customTriggers,
      rumorSignal: `Architect Signal: ${title}`,
      isCustomDug: true,
    };

    const updatedFromExits = [
      ...fromRoom.exits.filter((e) => e.direction !== dir),
      { direction: dir, targetRoomId: newRoomId },
    ];

    this.rooms.update((all) => [
      ...all.map((r) => (r.id === fromRoom.id ? { ...r, exits: updatedFromExits } : r)),
      newRoom,
    ]);

    this.activeRealmDelta.update((d) => ({
      ...d,
      updatedAtIso: new Date().toISOString(),
      customRoomIds: [...d.customRoomIds, newRoomId],
      roomOverrides: {
        ...d.roomOverrides,
        [fromRoom.id]: {
          ...(d.roomOverrides[fromRoom.id] ?? { roomId: fromRoom.id }),
          exits: updatedFromExits,
        },
        [newRoomId]: {
          roomId: newRoomId,
          title: newRoom.title,
          description: newRoom.description,
          legendType,
          exits: newRoom.exits,
          customMonsters,
          customItems,
          triggers: customTriggers,
          x: newX,
          y: newY,
          isCustomDug: true,
        },
      },
    }));

    this.selectedArchitectRoomId.set(newRoomId);
    this.appendFeed(
      'ARCHITECT',
      `[@dig] Excavated new chamber [${title}] (${newRoomId}) to the ${dir} and saved to Realm JSON Delta Layer.`,
    );
    void this.storage.saveRealmDelta(this.activeRealmDelta());
  }

  private handleMooDescribe(payload: Record<string, string>): void {
    const roomId = payload['roomId'] || this.selectedArchitectRoomId() || this.currentRoom().id;
    const title = payload['title'];
    const description = payload['description'] || '';
    const legendType = payload['legendType'] as CoreLegendType | undefined;

    this.rooms.update((all) =>
      all.map((r) =>
        r.id === roomId
          ? {
              ...r,
              title: title ?? r.title,
              description: description || r.description,
              legendType: legendType ?? r.legendType,
            }
          : r,
      ),
    );

    this.activeRealmDelta.update((d) => ({
      ...d,
      updatedAtIso: new Date().toISOString(),
      roomOverrides: {
        ...d.roomOverrides,
        [roomId]: {
          ...(d.roomOverrides[roomId] ?? { roomId }),
          title: title ?? d.roomOverrides[roomId]?.title,
          description: description || d.roomOverrides[roomId]?.description,
          legendType: legendType ?? d.roomOverrides[roomId]?.legendType,
        },
      },
    }));

    this.appendFeed('ARCHITECT', `[@describe] Updated room [${roomId}] in Realm Delta Layer.`);
    void this.storage.saveRealmDelta(this.activeRealmDelta());
  }

  private handleMooCraft(payload: Record<string, string>): void {
    const validSlots: PaperdollSlotType[] = [
      'Head',
      'Chest',
      'Legs',
      'Main-Hand',
      'Off-Hand',
      'Relic 1',
      'Relic 2',
    ];
    const requestedSlot = payload['slot'] as PaperdollSlotType;
    const slot: PaperdollSlotType = validSlots.includes(requestedSlot)
      ? requestedSlot
      : 'Main-Hand';
    const name = payload['name'] || 'Architect Forged Construct';

    const forgedItem: EquipmentItem = {
      id: `forged-${Date.now().toString(36).slice(-5)}`,
      name,
      slot,
      rarity: 'Relic',
      weight: 3,
      provenance: 'Architect Forged',
      originGateAddress: this.activeGateAddress().formatted,
      statBonuses: {
        STR: 4,
        DEX: 3,
        INT: 4,
        atkBonus: 7,
        speedPctBonus: 4,
      },
      totalStatBudget: 22,
    };

    const ruleset = this.activeRealmDelta().ruleset;
    const clamped = this.isVisitingExternalRealm()
      ? this.storage.enforceCustomsGateOnItem(forgedItem, ruleset)
      : forgedItem;

    this.character.update((c) => ({
      ...c,
      inventory: [...c.inventory, clamped],
    }));

    this.appendFeed(
      'ARCHITECT',
      `[@craft] Forged custom item [${forgedItem.name}] (${forgedItem.provenance}, Budget: ${forgedItem.totalStatBudget}) into inventory.`,
    );
    void this.storage.saveCharacterState(this.character());
  }

  private handleMooTrigger(payload: Record<string, string>): void {
    const roomId = payload['roomId'] || this.selectedArchitectRoomId() || this.currentRoom().id;
    const newTrigger: DeclarativeTrigger = {
      id: `trig-${Date.now().toString(36).slice(-4)}`,
      when: (payload['when'] as DeclarativeTrigger['when']) || 'ON_ENTER',
      ifCondition: payload['ifCondition'] || 'PER >= 12',
      doAction: (payload['doAction'] as DeclarativeTrigger['doAction']) || 'EMIT_LORE',
      actionPayload: payload['actionPayload'] || 'Architect resonance signal triggered.',
    };

    let updatedTriggers: DeclarativeTrigger[] = [];
    this.rooms.update((all) =>
      all.map((r) => {
        if (r.id !== roomId) return r;
        updatedTriggers = [...r.triggers, newTrigger];
        return { ...r, triggers: updatedTriggers };
      }),
    );

    this.activeRealmDelta.update((d) => ({
      ...d,
      updatedAtIso: new Date().toISOString(),
      roomOverrides: {
        ...d.roomOverrides,
        [roomId]: {
          ...(d.roomOverrides[roomId] ?? { roomId }),
          triggers: updatedTriggers,
        },
      },
    }));

    this.appendFeed(
      'ARCHITECT',
      `[@trigger] Wired declarative trigger [WHEN ${newTrigger.when} IF ${newTrigger.ifCondition} DO ${newTrigger.doAction}] on ${roomId}.`,
    );
    void this.storage.saveRealmDelta(this.activeRealmDelta());
  }

  private handleMooLegend(payload: Record<string, string>): void {
    const id = `custom-leg-${Date.now().toString(36).slice(-4)}`;
    const glyph = (payload['glyph'] || '✦').slice(0, 2);
    const colorHex = payload['colorHex'] || '#f472b6';
    const label = payload['label'] || 'Architect Custom Node';
    const tooltipDescription =
      payload['tooltipDescription'] ||
      `Custom symbol defined in ${this.activeGateAddress().formatted}`;

    const registered = this.legendRegistry.registerCustomEntry({
      id,
      glyph,
      label,
      colorHex,
      tooltipDescription,
    });

    const targetRoomId = this.selectedArchitectRoomId() || this.currentRoom().id;
    this.rooms.update((all) =>
      all.map((r) =>
        r.id === targetRoomId ? { ...r, legendType: 'custom', customLegendId: registered.id } : r,
      ),
    );

    this.activeRealmDelta.update((d) => ({
      ...d,
      updatedAtIso: new Date().toISOString(),
      customLegendEntries: [...d.customLegendEntries, registered],
      roomOverrides: {
        ...d.roomOverrides,
        [targetRoomId]: {
          ...(d.roomOverrides[targetRoomId] ?? { roomId: targetRoomId }),
          legendType: 'custom',
          customLegendId: registered.id,
        },
      },
    }));

    this.appendFeed(
      'ARCHITECT',
      `[@legend] Registered custom Legend symbol [${glyph} ${label}] (${colorHex}) and applied to ${targetRoomId}.`,
    );
    void this.storage.saveRealmDelta(this.activeRealmDelta());
  }

  graftOvergrowthIncursion(
    remoteAddress: ChaosGateAddress,
    remoteOwner: string,
    remoteEcho?: TravelerEcho,
  ): RoomNode[] {
    const localAddr = this.activeGateAddress();
    const incursion = this.chaosGate.generateOvergrowthIncursion(
      localAddr,
      remoteAddress,
      remoteOwner,
      this.rooms(),
      remoteEcho,
    );

    // Link anchor room to incursion
    const updatedRooms = this.rooms().map((r) => {
      if (r.id === incursion.anchorRoomId) {
        const exits = [...r.exits];
        if (!exits.some((e) => e.direction === incursion.anchorExitDir)) {
          exits.push({
            direction: incursion.anchorExitDir,
            targetRoomId: incursion.newRooms[0].id,
          });
        }
        return { ...r, exits };
      }
      return r;
    });

    const allRooms = [...updatedRooms, ...incursion.newRooms];
    this.rooms.set(allRooms);

    // Persist in activeRealmDelta overrides so it survives reloads and disconnects
    const delta = this.activeRealmDelta();
    const updatedOverrides = { ...delta.roomOverrides };

    // Update anchor room override
    const anchor = allRooms.find((r) => r.id === incursion.anchorRoomId)!;
    updatedOverrides[anchor.id] = {
      roomId: anchor.id,
      title: anchor.title,
      description: anchor.description,
      exits: anchor.exits,
      x: anchor.x,
      y: anchor.y,
    };

    // Save incursion rooms overrides
    for (const nr of incursion.newRooms) {
      updatedOverrides[nr.id] = {
        roomId: nr.id,
        title: nr.title,
        description: nr.description,
        legendType: nr.legendType,
        exits: nr.exits,
        customMonsters: nr.monsters,
        customItems: nr.items,
        x: nr.x,
        y: nr.y,
        isOvergrowth: true,
        originTriChord: nr.originTriChord,
        originPlayerName: nr.originPlayerName,
        isPrunable: false,
        shardsHarvestable: nr.shardsHarvestable,
        travelerEcho: nr.travelerEcho,
      };
    }

    const newDelta: RealmDelta = {
      ...delta,
      roomOverrides: updatedOverrides,
      customRoomIds: Array.from(
        new Set([...delta.customRoomIds, ...incursion.newRooms.map((r) => r.id)]),
      ),
      updatedAtIso: new Date().toISOString(),
    };

    this.activeRealmDelta.set(newDelta);
    void this.storage.saveRealmDelta(newDelta);

    this.appendFeed(
      'NETWORK',
      `⚡ [Overgrowth Incursion] Spliced Tri-Chords with ${remoteOwner} (${remoteAddress.formatted})! ${incursion.newRooms.length} hybrid chambers sprouted at ${anchor.title}.`,
    );

    return incursion.newRooms;
  }

  pruneRoom(roomId?: string): boolean {
    const targetId = roomId || this.currentRoom().id;
    const targetRoom = this.rooms().find((r) => r.id === targetId);

    if (!targetRoom) {
      this.appendFeed('SYSTEM', `Room ${targetId} does not exist.`);
      return false;
    }

    if (!targetRoom.isOvergrowth) {
      this.appendFeed(
        'SYSTEM',
        `Chamber '${targetRoom.title}' is native architecture. Only foreign Overgrowth chambers can be pruned.`,
      );
      return false;
    }

    const livingMobs = targetRoom.monsters.filter((m) => m.hp > 0);
    if (livingMobs.length > 0) {
      this.appendFeed(
        'COMBAT',
        `Cannot prune chamber! Foreign guardian '${livingMobs[0].name}' still guards this overgrowth. Defeat all hostiles first.`,
      );
      return false;
    }

    // Determine return room
    const returnExit = targetRoom.exits[0];
    const fallbackRoomId = returnExit ? returnExit.targetRoomId : 'room-0';

    const shardsEarned = targetRoom.shardsHarvestable ?? 20;

    // Update player currency & move player if inside
    this.character.update((c) => ({
      ...c,
      resonanceShards: (c.resonanceShards ?? 0) + shardsEarned,
      currentRoomId: c.currentRoomId === targetId ? fallbackRoomId : c.currentRoomId,
    }));
    void this.storage.saveCharacterState(this.character());

    // Remove room from rooms array and remove references in exits
    const updatedRooms = this.rooms()
      .filter((r) => r.id !== targetId)
      .map((r) => ({
        ...r,
        exits: r.exits.filter((e) => e.targetRoomId !== targetId),
      }));

    this.rooms.set(updatedRooms);

    // Remove from activeRealmDelta overrides
    const delta = this.activeRealmDelta();
    const updatedOverrides = { ...delta.roomOverrides };
    delete updatedOverrides[targetId];

    // Clean exit references in remaining overrides
    for (const ovr of Object.values(updatedOverrides)) {
      if (ovr.exits) {
        ovr.exits = ovr.exits.filter((e) => e.targetRoomId !== targetId);
      }
    }

    const newDelta: RealmDelta = {
      ...delta,
      roomOverrides: updatedOverrides,
      customRoomIds: delta.customRoomIds.filter((id) => id !== targetId),
      updatedAtIso: new Date().toISOString(),
    };
    this.activeRealmDelta.set(newDelta);
    void this.storage.saveRealmDelta(newDelta);

    this.appendFeed(
      'NARRATIVE',
      `✂️ [Pruned] Severed foreign overgrowth chamber '${targetRoom.title}'. Harvested +${shardsEarned} Resonance Shards (Balance: ${this.character().resonanceShards}).`,
    );

    return true;
  }

  barterEcho(echoId: string, itemId: string): boolean {
    const char = this.character();
    const currentRoom = this.currentRoom();
    const echo = currentRoom.travelerEcho;
    if (!echo || echo.id !== echoId) {
      this.appendFeed('SYSTEM', 'No Traveler Echo present in this chamber to barter with.');
      return false;
    }

    const item = echo.forgedItems.find((it) => it.id === itemId);
    if (!item) {
      this.appendFeed('SYSTEM', 'Item is not offered in the Echo catalog.');
      return false;
    }

    const cost = 15;
    if ((char.resonanceShards ?? 0) < cost) {
      this.appendFeed(
        'SYSTEM',
        `Insufficient Resonance Shards! Required: ${cost}, current balance: ${char.resonanceShards ?? 0}.`,
      );
      return false;
    }

    // Purchase copy
    const purchasedItem: EquipmentItem = {
      ...item,
      id: `echo-replica-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Replica of ${item.name}`,
    };

    this.character.update((c) => ({
      ...c,
      resonanceShards: c.resonanceShards - cost,
      inventory: [...c.inventory, purchasedItem],
    }));
    void this.storage.saveCharacterState(this.character());

    this.appendFeed(
      'SYSTEM',
      `💎 [Resonance Trade] Traded ${cost} Resonance Shards with Echo ${echo.playerName} for '${purchasedItem.name}'.`,
    );
    return true;
  }

  broadcastChatMessage(channel: 'ROOM' | 'SHOUT', text: string): P2PChatMessage {
    const char = this.character();
    const room = this.currentRoom();
    const cleanText = text.trim();

    const chatMsg: P2PChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderPeerId: this.transport.localPeerId,
      senderName: char.name,
      channel,
      text: cleanText,
      roomId: room.id,
      roomTitle: room.title,
      timestampIso: new Date().toISOString(),
    };

    this.chatLog.update((prev) => [chatMsg, ...prev].slice(0, 50));

    if (channel === 'ROOM') {
      this.appendFeed('CHAT', `💬 [Say] You: "${cleanText}"`, undefined, `[cmd: say ${cleanText}]`);
    } else {
      this.appendFeed(
        'CHAT',
        `📢 [Broadcast] You: "${cleanText}"`,
        undefined,
        `[cmd: shout ${cleanText}]`,
      );
    }

    this.transport.broadcastChatMessage(
      char.name,
      this.activeGateAddress().formatted,
      room.id,
      chatMsg,
    );

    return chatMsg;
  }

  setHeraldGreeting(
    templateId: number,
    adjective: string,
    noun: string,
    verb: string,
  ): HeraldGreeting {
    const greeting = formatHeraldGreeting(templateId, adjective, noun, verb);
    this.character.update((c) => ({ ...c, heraldGreeting: greeting }));
    void this.storage.saveCharacterState(this.character());
    this.appendFeed(
      'SYSTEM',
      `📜 [Herald Greeting Updated] "${greeting.formatted}"`,
      undefined,
      `[@greeting ${greeting.formatted}]`,
    );
    return greeting;
  }

  rollRandomHeraldGreeting(): HeraldGreeting {
    const greeting = rollRandomHeraldGreeting();
    this.character.update((c) => ({ ...c, heraldGreeting: greeting }));
    void this.storage.saveCharacterState(this.character());
    this.appendFeed(
      'SYSTEM',
      `🎲 [Herald Greeting Rolled] "${greeting.formatted}"`,
      undefined,
      `[@greeting ${greeting.formatted}]`,
    );
    return greeting;
  }

  listAdventurersInRealm(): void {
    const char = this.character();
    const room = this.currentRoom();
    const visitors = this.transport.activeVisitorsList();

    this.appendFeed('SYSTEM', `👥 [Adventurers In Realm] (${visitors.length + 1} Present)`);
    const myGreeting = char.heraldGreeting?.formatted
      ? ` — "${char.heraldGreeting.formatted}"`
      : '';
    this.appendFeed(
      'SYSTEM',
      `• You: ${char.name} (Lv.${char.level} ${char.archetype}) in "${room.title}" [Host]${myGreeting}`,
    );

    if (visitors.length === 0) {
      this.appendFeed(
        'SYSTEM',
        'No other adventurers detected in your mesh right now. Open another browser tab or connect via the Resonance Loom to delve & chat together!',
      );
    } else {
      for (const v of visitors) {
        const location =
          v.currentRoomId === room.id
            ? `Here with you (${room.title})`
            : `Sector ${v.currentRoomId}`;
        const peerGreeting = v.heraldGreeting ? ` — "${v.heraldGreeting}"` : '';
        this.appendFeed(
          'SYSTEM',
          `• ${v.playerName} (Lv.${v.level} ${v.archetype}) -- ${location} [${v.transport}]${peerGreeting}`,
        );
      }
    }
    this.appendFeed(
      'SYSTEM',
      'Chat & Herald: say <msg> (room), shout <msg> (realm), who (players), @greeting roll (change motto).',
    );
  }

  private onNetworkPacket(pkt: NetworkPacket): void {
    if (pkt.type === 'GATE_BEACON' && pkt.realmCartridgeBase64) {
      const imported = this.storage.importCartridgeBase64(pkt.realmCartridgeBase64);
      if (imported?.customLegendEntries?.length) {
        this.legendRegistry.mergeHostCustomLegends(imported.customLegendEntries);
      }
    } else if (pkt.type === 'THUNDERPASS_SPORE' && pkt.spore) {
      const remoteAddr = this.chaosGate.parseAddressString(pkt.spore.triChord);
      if (remoteAddr) {
        this.graftOvergrowthIncursion(remoteAddr, pkt.spore.playerName, pkt.spore.echo);
      }
    } else if (pkt.type === 'CHAT_MESSAGE' && pkt.chat) {
      const chat = pkt.chat;
      this.chatLog.update((prev) => [chat, ...prev].slice(0, 50));
      if (chat.channel === 'ROOM') {
        if (pkt.roomId === this.currentRoom().id) {
          this.appendFeed('CHAT', `💬 [Say] ${pkt.senderName}: "${chat.text}"`);
        } else {
          this.appendFeed(
            'CHAT',
            `💬 [Overheard] ${pkt.senderName} speaks from ${chat.roomTitle || 'a nearby chamber'}: "${chat.text}"`,
          );
        }
      } else {
        this.appendFeed(
          'CHAT',
          `📢 [Broadcast] ${pkt.senderName} (@${chat.roomTitle || 'The Void'}): "${chat.text}"`,
        );
      }
    } else if (pkt.type === 'COOP_COMBAT_INTENT' && pkt.combatIntent) {
      this.appendFeed(
        'NETWORK',
        `[Co-op Link: ${pkt.senderName}] Executed ${pkt.combatIntent.skillKey || pkt.combatIntent.type} in ${pkt.roomId}!`,
      );
    } else if (pkt.type === 'GRAVESTONE_RECORD' && pkt.gravestone) {
      this.telemetry.update((t) => ({
        ...t,
        guestbook: [pkt.gravestone!, ...t.guestbook],
      }));
      this.appendFeed(
        'NETWORK',
        `[Visitor Chronicle] ${pkt.senderName} left a ${pkt.gravestone.outcome} marker in ${pkt.gravestone.roomTitle}.`,
      );
    } else if (pkt.type === 'TRADE_OFFER' && pkt.tradeItem) {
      const ruleset = this.activeRealmDelta().ruleset;
      const clamped = this.storage.enforceCustomsGateOnItem(pkt.tradeItem, ruleset);
      this.character.update((c) => ({
        ...c,
        inventory: [...c.inventory, clamped],
      }));
      this.appendFeed('NETWORK', `[P2P Trade] Received [${clamped.name}] from ${pkt.senderName}!`);
    }
  }

  emitCurrentRoomNarrative(): void {
    const room = this.currentRoom();
    if (!room) return;
    const legend = this.legendRegistry.resolveEntry(room.legendType, room.customLegendId);

    const badges: TerminalFeedLine['badges'] = [];
    for (const mob of room.monsters.filter((m) => m.hp > 0)) {
      badges.push({
        label: `⚔ ${mob.name} (HP ${mob.hp})`,
        targetId: mob.id,
        actionType: 'ATTACK',
        colorHex: '#f87171',
      });
      badges.push({
        label: `🔍 Inspect ${mob.name}`,
        targetId: mob.id,
        actionType: 'INSPECT',
        colorHex: '#38bdf8',
      });
    }
    for (const item of room.items) {
      badges.push({
        label: `❖ Take ${item.name}`,
        targetId: item.id,
        actionType: 'TAKE_ITEM',
        colorHex: '#fbbf24',
      });
    }
    if (room.legendType === 'anchor-portal') {
      for (const peer of this.transport.activeVisitorsList()) {
        badges.push({
          label: `◈ Portal -> ${peer.gateAddress} (${peer.playerName})`,
          targetId: peer.gateAddress,
          actionType: 'ENTER_PORTAL',
          colorHex: '#c084fc',
        });
      }
    }

    const exitsStr = room.exits
      .filter((e) => !e.isSecret || this.effectiveAttributes().PER >= 12)
      .map((e) => `${e.direction}${e.isSecret ? '(Secret)' : ''}`)
      .join(', ');

    this.appendFeed(
      'NARRATIVE',
      `${legend.glyph} [${room.title}] — ${room.description} (Exits: ${exitsStr || 'None'})`,
      badges,
    );
  }

  appendFeed(
    category: TerminalFeedLine['category'],
    text: string,
    badges?: TerminalFeedLine['badges'],
    explicitSyntaxEcho?: string,
  ): void {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    const syntaxEcho = explicitSyntaxEcho ?? this.pendingSyntaxEcho;
    this.pendingSyntaxEcho = undefined;
    const line: TerminalFeedLine = {
      id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      category,
      text,
      syntaxEcho,
      badges,
    };
    this.terminalFeed.update((prev) => [line, ...prev.slice(0, 80)]);
  }

  private createInitialRealmDelta(): RealmDelta {
    const addr = this.chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs');
    return {
      gateAddress: addr,
      ownerName: 'Aegis_Architect',
      updatedAtIso: new Date().toISOString(),
      ruleset: {
        levelCap: 20,
        maxItemStatBudget: 28,
        allowArchitectForgedItems: true,
        pvpEnabled: false,
      },
      customLegendEntries: [],
      roomOverrides: {},
      customRoomIds: [],
    };
  }

  private createInitialCharacter(archetype: ArchetypeClass): CharacterState {
    const tmpl = ARCHETYPE_CATALOG[archetype];
    const starterWeapon: EquipmentItem = {
      id: 'item-starter-blade',
      name: 'Θ Chrono-Forged Halberd',
      slot: 'Main-Hand',
      rarity: 'Relic',
      weight: 5,
      provenance: 'Verified Drop',
      originGateAddress: 'Θ: Scorching Clockwork Catacombs',
      statBonuses: { STR: 4, DEX: 3, atkBonus: 8, speedPctBonus: 5 },
      totalStatBudget: 20,
      signatureHex: 'ecdsa-sim-9f814a2c0031b8e4',
      signerPublicKeyJwk: 'local-genesis-key',
    };

    const starterArmor: EquipmentItem = {
      id: 'item-starter-cuirass',
      name: 'Vanguard Aegis Carapace',
      slot: 'Chest',
      rarity: 'Rare',
      weight: 6,
      provenance: 'Verified Drop',
      originGateAddress: 'Θ: Scorching Clockwork Catacombs',
      statBonuses: { VIT: 4, STR: 2, mitigationBonus: 6 },
      totalStatBudget: 12,
      signatureHex: 'ecdsa-sim-4c219d0a8172e110',
      signerPublicKeyJwk: 'local-genesis-key',
    };

    const architectRelic: EquipmentItem = {
      id: 'item-architect-lens',
      name: 'Overclocked Chaos Gate Lens',
      slot: 'Relic 1',
      rarity: 'Mythic',
      weight: 2,
      provenance: 'Architect Forged',
      originGateAddress: 'Θ: Scorching Clockwork Catacombs',
      statBonuses: { PER: 5, INT: 5, atkBonus: 6, speedPctBonus: 6 },
      totalStatBudget: 22,
    };

    return {
      id: 'player-1',
      name: 'Vanguard_01',
      level: 3,
      xp: 240,
      gold: 180,
      archetype,
      baseAttributes: { ...tmpl.baseAttributes },
      hp: 240,
      stamina: 110,
      atbGauge: 45,
      autoAttackEnabled: false,
      paperdoll: {
        Head: null,
        Chest: starterArmor,
        Legs: null,
        'Main-Hand': starterWeapon,
        'Off-Hand': null,
        'Relic 1': architectRelic,
        'Relic 2': null,
      },
      inventory: [
        {
          id: 'inv-frost-buckler',
          name: 'Crystalline Ward Buckler',
          slot: 'Off-Hand',
          rarity: 'Rare',
          weight: 4,
          provenance: 'Verified Drop',
          originGateAddress: 'Δ: Crystalline Monolithic Citadel',
          statBonuses: { VIT: 3, DEX: 2, mitigationBonus: 8 },
          totalStatBudget: 13,
          signatureHex: 'ecdsa-sim-77ab1902cde45190',
        },
        {
          id: 'inv-overbudget-crown',
          name: 'Ω Astral Sovereign Diadem',
          slot: 'Head',
          rarity: 'Mythic',
          weight: 3,
          provenance: 'Architect Forged',
          originGateAddress: 'Ω: Aetherial Astral Spire',
          statBonuses: { INT: 8, PER: 6, DEX: 4, atkBonus: 10, speedPctBonus: 6 },
          totalStatBudget: 34,
        },
      ],
      maxWeight: 45,
      activeSkills: tmpl.skills.map((s) => ({ ...s, currentCooldownMs: 0 })),
      passiveTraits: [...tmpl.passives],
      statuses: [],
      currentRoomId: 'room-0',
      visitedRoomIds: ['room-0', 'room-1'],
      bestiaryUnlocked: {
        'chrono-automaton': { kills: 2, inspectedLevel: 2 },
      },
      resonanceShards: 25,
      heraldGreeting: formatHeraldGreeting(0, 'Radiant', 'Beacon', 'triumph'),
    };
  }

  private createInitialTelemetry(): TelemetryLog {
    return {
      combatSamples: [
        {
          timestampMs: Date.now() - 45000,
          actorId: 'player-1',
          actorName: 'Vanguard_01',
          targetName: 'Θ-Rank Chrono-Automaton',
          skillId: 'sk-sunder',
          skillName: 'Sunder Strike',
          element: 'Physical',
          rollValue: 74,
          outcome: 'HIT',
          damageDealt: 46,
          damageMitigated: 8,
          overkill: 0,
          healingDone: 0,
          statusApplied: 'Sunder',
        },
        {
          timestampMs: Date.now() - 38000,
          actorId: 'player-1',
          actorName: 'Vanguard_01',
          targetName: 'Θ-Rank Chrono-Automaton',
          skillId: 'sk-cinder-cleave',
          skillName: 'Cinder Cleave',
          element: 'Fire',
          rollValue: 93,
          outcome: 'CRIT',
          damageDealt: 88,
          damageMitigated: 6,
          overkill: 14,
          healingDone: 0,
          statusApplied: 'Burn',
        },
        {
          timestampMs: Date.now() - 30000,
          actorId: 'player-1',
          actorName: 'Vanguard_01',
          targetName: 'Θ-Rank Brass Scuttler',
          skillId: 'sk-aegis-pulse',
          skillName: 'Aegis Shock',
          element: 'Lightning',
          rollValue: 61,
          outcome: 'HIT',
          damageDealt: 39,
          damageMitigated: 5,
          overkill: 0,
          healingDone: 15,
          statusApplied: 'Overcharge',
        },
      ],
      statusUptimeMs: {
        Burn: 14200,
        Chill: 6800,
        Sunder: 19400,
        Overcharge: 11200,
        Silenced: 1200,
        Regen: 8400,
      },
      roomMetrics: {
        'room-0': {
          roomId: 'room-0',
          visitorCount: 14,
          playerDeaths: 0,
          totalTimeSpentMs: 42000,
          lootExtractedCount: 1,
        },
        'room-1': {
          roomId: 'room-1',
          visitorCount: 11,
          playerDeaths: 1,
          totalTimeSpentMs: 68000,
          lootExtractedCount: 3,
        },
        'room-2': {
          roomId: 'room-2',
          visitorCount: 9,
          playerDeaths: 0,
          totalTimeSpentMs: 51000,
          lootExtractedCount: 4,
        },
        'room-3': {
          roomId: 'room-3',
          visitorCount: 8,
          playerDeaths: 3,
          totalTimeSpentMs: 79000,
          lootExtractedCount: 2,
        },
        'room-4': {
          roomId: 'room-4',
          visitorCount: 6,
          playerDeaths: 1,
          totalTimeSpentMs: 95000,
          lootExtractedCount: 2,
        },
        'room-5': {
          roomId: 'room-5',
          visitorCount: 7,
          playerDeaths: 0,
          totalTimeSpentMs: 62000,
          lootExtractedCount: 0,
        },
        'room-6': {
          roomId: 'room-6',
          visitorCount: 4,
          playerDeaths: 0,
          totalTimeSpentMs: 38000,
          lootExtractedCount: 6,
        },
        'room-7': {
          roomId: 'room-7',
          visitorCount: 5,
          playerDeaths: 4,
          totalTimeSpentMs: 124000,
          lootExtractedCount: 3,
        },
      },
      guestbook: [
        {
          id: 'gb-seed-1',
          visitorName: 'Kite_Zero',
          archetype: 'Chronomancer',
          timestampIso: '2026-10-30T18:10:00.000Z',
          outcome: 'BOSS_CLEARED',
          roomId: 'room-7',
          roomTitle: 'Sanctum of the Arch-Regent of the Deep Crypt',
          epitaphOrNote:
            'Sunder + Tachyon Surge combo melted the Arch-Regent shield phase! Verified Relic claimed.',
          replayFrames: [
            {
              tickIndex: 10,
              timestampOffsetMs: 1000,
              roomId: 'room-0',
              actorName: 'Kite_Zero',
              narrativeLine: 'Kite_Zero materialized at Θ Chaos Gate Anchor.',
              playerHpPct: 100,
              enemyHpPct: 100,
            },
            {
              tickIndex: 45,
              timestampOffsetMs: 4500,
              roomId: 'room-4',
              actorName: 'Kite_Zero',
              narrativeLine:
                'Kite_Zero inspected the Clockwork escapement gears (PER 16) and unlocked the secret vault.',
              playerHpPct: 92,
              enemyHpPct: 100,
            },
            {
              tickIndex: 90,
              timestampOffsetMs: 9000,
              roomId: 'room-7',
              actorName: 'Kite_Zero',
              narrativeLine:
                'Kite_Zero cast Entropy Fracture -> Singularity Nova on Arch-Regent for 112 CRIT Fire DMG!',
              playerHpPct: 68,
              enemyHpPct: 0,
            },
          ],
        },
        {
          id: 'gb-seed-2',
          visitorName: 'Balmung_IX',
          archetype: 'Hexblade',
          timestampIso: '2026-10-30T17:42:00.000Z',
          outcome: 'PARTY_WIPED',
          roomId: 'room-3',
          roomTitle: 'Scorching Clockwork Charnel Nave 3',
          epitaphOrNote: 'Caught off-guard by the Collapsing Crypt Floorplate while Sundered.',
          replayFrames: [
            {
              tickIndex: 12,
              timestampOffsetMs: 1200,
              roomId: 'room-3',
              actorName: 'Balmung_IX',
              narrativeLine: 'Balmung_IX triggered Collapsing Crypt Floorplate (-12 HP).',
              playerHpPct: 45,
              enemyHpPct: 80,
            },
            {
              tickIndex: 28,
              timestampOffsetMs: 2800,
              roomId: 'room-3',
              actorName: 'Θ-Rank Pendulum Sentinel',
              narrativeLine: 'Θ-Rank Pendulum Sentinel struck Balmung_IX for 34 DMG (Party Wiped).',
              playerHpPct: 0,
              enemyHpPct: 35,
            },
          ],
        },
      ],
      careerChronicle: [
        {
          id: 'cc-1',
          timestampIso: '2026-10-28T20:00:00.000Z',
          gateAddress: 'Δ: Silent Fungal Observatory',
          era: 'Δ',
          eventTitle: 'Conquered Δ: Silent Fungal Observatory',
          conquered: true,
          xpEarned: 80,
          goldEarned: 55,
          cumulativeXp: 80,
          cumulativeGold: 55,
        },
        {
          id: 'cc-2',
          timestampIso: '2026-10-29T21:15:00.000Z',
          gateAddress: 'Δ: Crystalline Monolithic Citadel',
          era: 'Δ',
          eventTitle: 'Conquered Δ: Crystalline Monolithic Citadel',
          conquered: true,
          xpEarned: 95,
          goldEarned: 65,
          cumulativeXp: 175,
          cumulativeGold: 120,
        },
        {
          id: 'cc-3',
          timestampIso: '2026-10-30T16:30:00.000Z',
          gateAddress: 'Θ: Scorching Clockwork Catacombs',
          era: 'Θ',
          eventTitle: 'Established Home Anchor in Θ Era',
          conquered: true,
          xpEarned: 65,
          goldEarned: 60,
          cumulativeXp: 240,
          cumulativeGold: 180,
        },
      ],
    };
  }

  ngOnDestroy(): void {
    this.stopAtbLoop();
    this.netSub?.unsubscribe();
  }
}

/**
 * Core Domain Schemas for Linked Pocket Realms (Serverless P2P MUD PWA)
 */

export type ServerEraLetter = 'Δ' | 'Θ' | 'Λ' | 'Σ' | 'Ω';

export interface ServerEraMetadata {
  letter: ServerEraLetter;
  name: 'Delta' | 'Theta' | 'Lambda' | 'Sigma' | 'Omega';
  levelTier: number;
  statMultiplier: number;
}

export type AtmospherePrefix =
  | 'Scorching'
  | 'Silent'
  | 'Crystalline'
  | 'Abyssal'
  | 'Tempestuous'
  | 'Blighted'
  | 'Aetherial'
  | 'Gilded';

export type StructuralTheme =
  | 'Clockwork'
  | 'Fungal'
  | 'Monolithic'
  | 'Labyrinthine'
  | 'Sunken'
  | 'Astral'
  | 'Ossuary'
  | 'Forge';

export type BiomeNoun =
  | 'Catacombs'
  | 'Observatory'
  | 'Citadel'
  | 'Sanctuary'
  | 'Archive'
  | 'Spire'
  | 'Bazaar'
  | 'Crucible';

export type TopologyPattern =
  | 'labyrinth'
  | 'ring'
  | 'tower'
  | 'hub-and-spoke'
  | 'grid-loop'
  | 'deep-descent'
  | 'cluster-spore'
  | 'symmetrical-wing';

export type ElementalAffinity = 'Fire' | 'Frost' | 'Void' | 'Lightning' | 'Bio' | 'Physical';

export type StatusTag = 'Burn' | 'Chill' | 'Sunder' | 'Overcharge' | 'Silenced' | 'Regen';

export interface ChaosGateAddress {
  era: ServerEraLetter;
  atmosphere: AtmospherePrefix;
  theme: StructuralTheme;
  biome: BiomeNoun;
  formatted: string; // e.g., "Θ: Scorching Clockwork Catacombs"
  seed: number; // Deterministic 32-bit integer for Mulberry32
}

export type CoreLegendType =
  | 'anchor-portal'
  | 'safe-campfire'
  | 'elite-boss'
  | 'puzzle-mechanism'
  | 'lore-terminal'
  | 'treasure-vault'
  | 'hazard-trap'
  | 'merchant-shrine'
  | 'corridor'
  | 'custom';

export interface LegendEntry {
  id: string;
  classification: CoreLegendType;
  glyph: string;
  label: string;
  colorHex: string;
  tooltipDescription: string;
  isCustom?: boolean;
}

export interface LegendRegistry {
  coreEntries: Record<CoreLegendType, LegendEntry>;
  customEntries: Record<string, LegendEntry>;
}

export type ArchetypeClass = 'Vanguard' | 'Chronomancer' | 'Hexblade' | 'Artificer';

export interface CoreAttributes {
  STR: number;
  DEX: number;
  INT: number;
  PER: number;
  VIT: number;
}

export interface DerivedCombatStats {
  maxHp: number;
  maxStamina: number;
  atk: number;
  mitigationPct: number;
  critChancePct: number;
  critMultiplier: number;
  atbFillRatePerTick: number; // % filled per 100ms tick
}

export type PaperdollSlotType =
  'Head' | 'Chest' | 'Legs' | 'Main-Hand' | 'Off-Hand' | 'Relic 1' | 'Relic 2';

export type ItemProvenance = 'Verified Drop' | 'Architect Forged';

export interface ProvenanceRecord {
  action: 'Forged' | 'Spliced' | 'Bartered' | 'Plundered';
  architect: string;
  realm: string;
  timestamp: number;
  price?: number;
}

export interface BazaarListing {
  id: string;
  sellerName: string;
  sellerAddress: string;
  item: EquipmentItem;
  shardPrice: number;
  listedAt: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: PaperdollSlotType;
  rarity: 'Common' | 'Rare' | 'Relic' | 'Mythic';
  weight: number;
  provenance: ItemProvenance;
  originGateAddress: string;
  statBonuses: Partial<CoreAttributes> & {
    atkBonus?: number;
    speedPctBonus?: number;
    mitigationBonus?: number;
  };
  totalStatBudget: number;
  description?: string;
  /** Clamped values applied when visiting a realm with a stricter RulesetManifest */
  clampedStatBudget?: number;
  clampedScaleFactor?: number;
  isSphereCore?: boolean;
  sphereCoreAddress?: ChaosGateAddress;
  sphereCoreRarity?: string;
  isLocked?: boolean;
  signatureHex?: string; // ECDSA SubtleCrypto signature for Verified Drops
  signerPublicKeyJwk?: string;
  provenanceChain?: ProvenanceRecord[];
}

export type PaperdollSlots = Record<PaperdollSlotType, EquipmentItem | null>;

export interface SkillSlot {
  id: string;
  name: string;
  commandKey: string; // e.g., 'sunder', 'chrono-bolt', 'hex-drain', 'arc-turret'
  archetype: ArchetypeClass;
  staminaCost: number;
  cooldownMs: number;
  currentCooldownMs: number;
  powerMultiplier: number;
  element: ElementalAffinity;
  statusApplied?: StatusTag;
  comboTriggerStatus?: StatusTag;
  description: string;
}

export interface PassiveTrait {
  id: string;
  name: string;
  archetype: ArchetypeClass;
  description: string;
  statModifier: Partial<CoreAttributes>;
}

export interface ActiveStatusEffect {
  tag: StatusTag;
  remainingMs: number;
  stacks: number;
  sourceId: string;
}

export interface HeraldGreeting {
  templateId: number;
  adjective: string;
  noun: string;
  verb: string;
  formatted: string;
}

export interface HeraldTemplate {
  id: number;
  pattern: string;
  usesVerb: boolean;
  format: (adj: string, noun: string, verb: string) => string;
}

export const HERALD_TEMPLATES: HeraldTemplate[] = [
  {
    id: 0,
    pattern: 'May the {adj} {noun} guide your journey.',
    usesVerb: false,
    format: (adj, noun) => `May the ${adj} ${noun} guide your journey.`,
  },
  {
    id: 1,
    pattern: 'Beware: {adj} {noun} lurks ahead.',
    usesVerb: false,
    format: (adj, noun) => `Beware: ${adj} ${noun} lurks ahead.`,
  },
  {
    id: 2,
    pattern: 'Praise the {adj} {noun}! Time to {verb}.',
    usesVerb: true,
    format: (adj, noun, verb) => `Praise the ${adj} ${noun}! Time to ${verb}.`,
  },
  {
    id: 3,
    pattern: 'Greetings, traveler. Seek the {adj} {noun}.',
    usesVerb: false,
    format: (adj, noun) => `Greetings, traveler. Seek the ${adj} ${noun}.`,
  },
  {
    id: 4,
    pattern: 'Only a {adj} {noun} shall {verb} the Gate.',
    usesVerb: true,
    format: (adj, noun, verb) => `Only a ${adj} ${noun} shall ${verb} the Gate.`,
  },
  {
    id: 5,
    pattern: 'By the {adj} {noun}, we shall {verb}!',
    usesVerb: true,
    format: (adj, noun, verb) => `By the ${adj} ${noun}, we shall ${verb}!`,
  },
  {
    id: 6,
    pattern: '{adj} {noun} ahead, therefore {verb}.',
    usesVerb: true,
    format: (adj, noun, verb) => `${adj} ${noun} ahead, therefore ${verb}.`,
  },
  {
    id: 7,
    pattern: 'Behold, {adj} {noun}! Let us {verb}.',
    usesVerb: true,
    format: (adj, noun, verb) => `Behold, ${adj} ${noun}! Let us ${verb}.`,
  },
];

export const HERALD_ADJECTIVES = [
  'Radiant',
  'Clockwork',
  'Astral',
  'Fungal',
  'Eldritch',
  'Silent',
  'Scorching',
  'Valiant',
  'Harmonic',
  'Prismatic',
  'Ancient',
  'Crystalline',
  'Resonant',
  'Storm-forged',
  'Gilded',
  'Aetherial',
] as const;

export const HERALD_NOUNS = [
  'Beacon',
  'Loom',
  'Wanderer',
  'Shadow',
  'Blade',
  'Relic',
  'Sanctuary',
  'Chamber',
  'Overgrowth',
  'Gate',
  'Spore',
  'Echo',
  'Crucible',
  'Nexus',
  'Campfire',
  'Sentinel',
] as const;

export const HERALD_VERBS = [
  'triumph',
  'prevail',
  'strike',
  'explore',
  'rest',
  'awaken',
  'persevere',
  'listen',
  'advance',
  'attune',
  'rejoice',
  'endure',
] as const;

export type HeraldAdjective = (typeof HERALD_ADJECTIVES)[number];
export type HeraldNoun = (typeof HERALD_NOUNS)[number];
export type HeraldVerb = (typeof HERALD_VERBS)[number];

export function formatHeraldGreeting(
  templateId: number,
  adjective: string,
  noun: string,
  verb: string,
): HeraldGreeting {
  const safeId = Math.max(0, Math.min(HERALD_TEMPLATES.length - 1, templateId || 0));
  const tmpl = HERALD_TEMPLATES[safeId];
  const safeAdj = (HERALD_ADJECTIVES as readonly string[]).includes(adjective)
    ? adjective
    : HERALD_ADJECTIVES[0];
  const safeNoun = (HERALD_NOUNS as readonly string[]).includes(noun) ? noun : HERALD_NOUNS[0];
  const safeVerb = (HERALD_VERBS as readonly string[]).includes(verb) ? verb : HERALD_VERBS[0];
  return {
    templateId: tmpl.id,
    adjective: safeAdj,
    noun: safeNoun,
    verb: safeVerb,
    formatted: tmpl.format(safeAdj, safeNoun, safeVerb),
  };
}

export function rollRandomHeraldGreeting(): HeraldGreeting {
  const tmplId = Math.floor(Math.random() * HERALD_TEMPLATES.length);
  const adj = HERALD_ADJECTIVES[Math.floor(Math.random() * HERALD_ADJECTIVES.length)];
  const noun = HERALD_NOUNS[Math.floor(Math.random() * HERALD_NOUNS.length)];
  const verb = HERALD_VERBS[Math.floor(Math.random() * HERALD_VERBS.length)];
  return formatHeraldGreeting(tmplId, adj, noun, verb);
}

export interface CharacterState {
  id: string;
  name: string;
  level: number;
  xp: number;
  gold: number;
  archetype: ArchetypeClass;
  baseAttributes: CoreAttributes;
  hp: number;
  stamina: number;
  atbGauge: number; // 0 to 100
  autoAttackEnabled: boolean;
  paperdoll: PaperdollSlots;
  inventory: EquipmentItem[];
  maxWeight: number;
  activeSkills: SkillSlot[]; // up to 4
  passiveTraits: PassiveTrait[]; // up to 2
  statuses: ActiveStatusEffect[];
  currentRoomId: string;
  visitedRoomIds: string[];
  bestiaryUnlocked: Record<string, { kills: number; inspectedLevel: number }>;
  resonanceShards: number;
  sanctumVaultShards?: number;
  heraldGreeting: HeraldGreeting;
}

export type ExitDirection = 'N' | 'S' | 'E' | 'W' | 'U' | 'D';
export type CompassDirection = 'N' | 'E' | 'S' | 'W';

export interface TravelerEcho {
  id: string;
  playerName: string;
  archetype: ArchetypeClass;
  level: number;
  triChord: string;
  forgedItems: EquipmentItem[];
  encounterTimestampIso: string;
  isDefeated?: boolean;
  hp?: number;
  maxHp?: number;
  heraldGreeting?: string;
}

export interface PhantomBreadcrumb {
  id: string;
  peerId: string;
  playerName: string;
  archetype: ArchetypeClass;
  roomId: string;
  roomTitle: string;
  timestampMs: number;
  heraldGreeting?: string;
  actionText?: string;
}

export interface TombstoneRecord {
  id: string;
  slainPlayerName: string;
  slainBy: string;
  epitaph: string;
  timestamp: number;
  tributeCount: number;
}

export interface GrimoireData {
  id: string;
  title: string;
  authorName: string;
  pages: string[];
  createdAt: number;
  sealed?: boolean;
}

export interface LinkedMechanismData {
  id: string;
  name: string;
  state: 'LOCKED' | 'ACTIVATED' | 'HARMONIZED';
  activatedByLocal: boolean;
  activatedByRemote: boolean;
  lastActivationTime?: number;
  rewardClaimed: boolean;
}

export interface ThunderpassSporePayload {
  peerPublicKey: string;
  playerName: string;
  triChord: string;
  echo: TravelerEcho;
  signatureRoomDelta?: RoomDeltaOverride;
  timestampMs: number;
  heraldGreeting?: string;
  breadcrumbs?: PhantomBreadcrumb[];
  tombstones?: TombstoneRecord[];
  grimoire?: GrimoireData;
}

export interface ThunderpassEncounter {
  id: string;
  zoneHash: string;
  peerPublicKey: string;
  playerName: string;
  triChord: string;
  timestampIso: string;
  echo: TravelerEcho;
  roomsGrafted: string[];
  heraldGreeting?: string;
}

export interface RoomExit {
  direction: ExitDirection;
  targetRoomId: string;
  isSecret?: boolean;
  requiredKeyId?: string;
  isLocked?: boolean;
  isSynthesisSeam?: boolean;
  synthesisAtmosphere?: string;
  isRiftPortal?: boolean;
}

export interface ConjunctionAnomaly {
  prefix: string; // e.g. "Anomalous", "Void-Warped", "Prismatic-Surge", "Eldritch-Resonance", "Chrono-Fractured", "Cataclysmic"
  hazard: string; // e.g. "Void-Burn Hazard", "Aetherial Overcharge Zone", "Gravity Shear", "Corrosive Spore Mist"
  mobModifier: string; // e.g. "Blink-Step", "Reflective Carapace", "Vampiric Leech", "Volatile Death-Burst", "Titan-Forged"
  colorHex: string;
}

export interface TraitProfile {
  atmospheres: Record<AtmospherePrefix, number>;
  architectures: Record<StructuralTheme, number>;
  biomes: Record<BiomeNoun, number>;
  primaryAtmosphere: AtmospherePrefix;
  primaryArchitecture: StructuralTheme;
  primaryBiome: BiomeNoun;
  totalRooms: number;
}

export interface DeclarativeTrigger {
  id: string;
  when: 'ON_ENTER' | 'ON_INSPECT' | 'ON_COMBAT_CLEAR' | 'ON_COMMAND';
  ifCondition: string; // e.g., "PER >= 12" or "HAS_ITEM:rusty-gear" or "ALWAYS"
  doAction: 'UNLOCK_EXIT' | 'SPAWN_ITEM' | 'DEAL_HAZARD' | 'EMIT_LORE' | 'HEAL_PARTY';
  actionPayload: string;
}

export interface MonsterBodyPart {
  id: string;
  name: string; // e.g. "Core Dynamo", "Left Scythe-Claw", "Chitin Carapace"
  hp: number;
  maxHp: number;
  isSevered: boolean;
  debuffAppliedOnBreak: string; // e.g. "-30% Atk", "-40% Mit", "Stunned"
  partEffectDescription: string;
}

export interface MonsterEntity {
  id: string;
  templateId: string;
  name: string;
  level: number;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  mitigationPct: number;
  speed: number;
  atbGauge: number;
  element: ElementalAffinity;
  weakness: ElementalAffinity;
  statuses: ActiveStatusEffect[];
  adjectives?: string[];
  loreSnippet: string;
  secretWeaknessHint: string;
  lootTable: EquipmentItem[];
  targetableParts?: MonsterBodyPart[];
}

export interface RoomNode {
  id: string;
  title: string;
  description: string;
  x: number; // SVG topological layout coordinate (0-1000)
  y: number; // SVG topological layout coordinate (0-600)
  depthTier: number;
  legendType: CoreLegendType;
  customLegendId?: string;
  atmosphereEffect: string;
  elementalMutator: ElementalAffinity;
  exits: RoomExit[];
  monsters: MonsterEntity[];
  items: EquipmentItem[];
  triggers: DeclarativeTrigger[];
  rumorSignal: string; // Shown in Fog-of-War on adjacent unvisited nodes
  growthStage?: number;
  propInteractable?: { name: string; type: string; action: string; solved?: boolean };
  isCustomDug?: boolean;
  isOvergrowth?: boolean;
  originTriChord?: string;
  originPlayerName?: string;
  isPrunable?: boolean;
  shardsHarvestable?: number;
  travelerEcho?: TravelerEcho;
  isSynthesisSeam?: boolean;
  synthesisAtmosphere?: string;
  atmospherePrefix?: AtmospherePrefix;
  structuralTheme?: StructuralTheme;
  biomeNoun?: BiomeNoun;
  isConjunction?: boolean;
  conjunctionAnomaly?: ConjunctionAnomaly;
  isExpedition?: boolean;
  isRiftPortal?: boolean;
  inscriptions?: ChalkInscription[];
  phantomTrails?: PhantomBreadcrumb[];
  tombstones?: TombstoneRecord[];
  grimoire?: GrimoireData;
  linkedMechanism?: LinkedMechanismData;
  bazaar?: BazaarListing[];
}

export interface RulesetManifest {
  levelCap: number;
  maxItemStatBudget: number;
  allowArchitectForgedItems: boolean;
  pvpEnabled: boolean;
}

export interface RoomDeltaOverride {
  roomId: string;
  title?: string;
  description?: string;
  legendType?: CoreLegendType;
  customLegendId?: string;
  exits?: RoomExit[];
  triggers?: DeclarativeTrigger[];
  customMonsters?: MonsterEntity[];
  customItems?: EquipmentItem[];
  x?: number;
  y?: number;
  growthStage?: number;
  propInteractable?: { name: string; type: string; action: string; solved?: boolean };
  isCustomDug?: boolean;
  isOvergrowth?: boolean;
  originTriChord?: string;
  originPlayerName?: string;
  isPrunable?: boolean;
  shardsHarvestable?: number;
  travelerEcho?: TravelerEcho;
  isSynthesisSeam?: boolean;
  synthesisAtmosphere?: string;
  atmospherePrefix?: AtmospherePrefix;
  structuralTheme?: StructuralTheme;
  biomeNoun?: BiomeNoun;
  isConjunction?: boolean;
  conjunctionAnomaly?: ConjunctionAnomaly;
  isExpedition?: boolean;
  isRiftPortal?: boolean;
  inscriptions?: ChalkInscription[];
  phantomTrails?: PhantomBreadcrumb[];
  tombstones?: TombstoneRecord[];
  grimoire?: GrimoireData;
  linkedMechanism?: LinkedMechanismData;
  bazaar?: BazaarListing[];
}

export interface ChalkInscription {
  id: string;
  authorName: string;
  authorTriChord: string;
  text: string;
  timestampIso: string;
  glyph?: string;
}

export interface ConvergenceEncounterBanner {
  peerName: string;
  peerTriChord: string;
  localTheme: string;
  remoteTheme: string;
  roomsGraftedCount: number;
  timestampMs: number;
}

export interface RealmData {
  gateAddress: ChaosGateAddress;
  ownerName: string;
  ownerPublicKeyJwk?: string;
  updatedAtIso: string;
  ruleset: RulesetManifest;
  customLegendEntries: LegendEntry[];
  roomOverrides: Record<string, RoomDeltaOverride>;
  customRoomIds: string[];
  growthStage?: number; // 1..10
  vitalityXP?: number;
  lastCultivationTimestampMs?: number;
  conjunctionCount?: number;
  traitProfile?: TraitProfile;
}

export type RealmDelta = RealmData;

export interface RealmDnaPacket {
  triChord: string;
  growthStage: number;
  customRoomDeltas?: RoomDeltaOverride[];
  playerEcho?: TravelerEcho;
  timestampMs?: number;
  traitProfile?: TraitProfile;
}

export interface CombatTelemetrySample {
  timestampMs: number;
  actorId: string;
  actorName: string;
  targetName: string;
  skillId: string;
  skillName: string;
  element: ElementalAffinity;
  rollValue: number; // 1-100 RNG roll
  outcome: 'HIT' | 'CRIT' | 'MISS' | 'STATUS' | 'HEAL';
  damageDealt: number;
  damageMitigated: number;
  overkill: number;
  healingDone: number;
  statusApplied?: StatusTag;
}

export interface RoomTelemetryMetrics {
  roomId: string;
  visitorCount: number;
  playerDeaths: number;
  totalTimeSpentMs: number;
  lootExtractedCount: number;
}

export interface GuestbookGravestoneEntry {
  id: string;
  visitorName: string;
  archetype: ArchetypeClass;
  timestampIso: string;
  outcome: 'BOSS_CLEARED' | 'PARTY_WIPED' | 'VISITED';
  roomId: string;
  roomTitle: string;
  epitaphOrNote: string;
  replayFrames: ReplayFrame[];
}

export interface ReplayFrame {
  tickIndex: number;
  timestampOffsetMs: number;
  roomId: string;
  actorName: string;
  narrativeLine: string;
  playerHpPct: number;
  enemyHpPct: number;
}

export interface CareerChronicleEntry {
  id: string;
  timestampIso: string;
  gateAddress: string;
  era: ServerEraLetter;
  eventTitle: string;
  conquered: boolean;
  xpEarned: number;
  goldEarned: number;
  cumulativeXp: number;
  cumulativeGold: number;
}

export interface TelemetryLog {
  combatSamples: CombatTelemetrySample[];
  statusUptimeMs: Record<StatusTag, number>;
  roomMetrics: Record<string, RoomTelemetryMetrics>;
  guestbook: GuestbookGravestoneEntry[];
  careerChronicle: CareerChronicleEntry[];
}

export type CommandActionType =
  | 'MOVE'
  | 'LOOK'
  | 'INSPECT'
  | 'ATTACK'
  | 'CAST_SKILL'
  | 'TAKE_ITEM'
  | 'EQUIP_ITEM'
  | 'REST_CAMPFIRE'
  | 'ENTER_PORTAL'
  | 'PRUNE_ROOM'
  | 'BARTER_ECHO'
  | 'CHAT_MESSAGE'
  | 'MOO_DIG'
  | 'MOO_DESCRIBE'
  | 'MOO_CRAFT'
  | 'MOO_TRIGGER'
  | 'MOO_LEGEND';

export interface CommandIntent {
  type: CommandActionType;
  rawInput: string;
  source: 'TERMINAL' | 'HUD';
  targetId?: string;
  skillKey?: string;
  direction?: ExitDirection;
  payload?: Record<string, string>;
}

export interface TerminalFeedLine {
  id: string;
  timestamp: string;
  category: 'NARRATIVE' | 'COMBAT' | 'SYSTEM' | 'LORE' | 'ARCHITECT' | 'NETWORK' | 'CHAT';
  text: string;
  syntaxEcho?: string; // e.g. "[cmd: take rusted key]" when triggered via tactile UI
  badges?: {
    label: string;
    targetId: string;
    actionType: 'INSPECT' | 'ATTACK' | 'TAKE_ITEM' | 'MOVE' | 'ENTER_PORTAL';
    colorHex?: string;
  }[];
}

export interface P2PChatMessage {
  id: string;
  senderPeerId: string;
  senderName: string;
  channel: 'ROOM' | 'SHOUT';
  text: string;
  roomId: string;
  roomTitle: string;
  timestampIso: string;
}

export type NetworkPacketType =
  | 'GATE_BEACON'
  | 'PORTAL_TRAVERSE_REQUEST'
  | 'PORTAL_REALM_SYNC'
  | 'VISITOR_POSITION_UPDATE'
  | 'COOP_COMBAT_INTENT'
  | 'GRAVESTONE_RECORD'
  | 'TRADE_OFFER'
  | 'THUNDERPASS_SPORE'
  | 'CHAT_MESSAGE'
  | 'CHALK_INSCRIPTION'
  | 'TOMBSTONE_COMMITTED'
  | 'GRIMOIRE_SHARED'
  | 'MECHANISM_PULLED'
  | 'BAZAAR_LISTED'
  | 'BAZAAR_PURCHASED'
  | 'PEER_CHAT';

export interface NetworkPeerVisitor {
  peerId: string;
  playerName: string;
  archetype: ArchetypeClass;
  level: number;
  gateAddress: string;
  currentRoomId: string;
  inCombat: boolean;
  lastSeenMs: number;
  transport: 'BroadcastChannel' | 'WebRTC';
  heraldGreeting?: string;
  currentHp?: number;
  maxHp?: number;
  isAstralEcho?: boolean;
}

export interface NetworkPacket {
  packetId: string;
  senderPeerId: string;
  senderName: string;
  timestampMs: number;
  type: NetworkPacketType;
  gateAddress: string;
  roomId?: string;
  realmCartridgeBase64?: string;
  combatIntent?: CommandIntent;
  gravestone?: GuestbookGravestoneEntry;
  tradeItem?: EquipmentItem;
  spore?: ThunderpassSporePayload;
  echo?: TravelerEcho;
  chat?: P2PChatMessage;
  chalkInscription?: ChalkInscription;
  breadcrumbs?: PhantomBreadcrumb[];
  tombstone?: TombstoneRecord;
  grimoire?: GrimoireData;
  linkedMechanism?: LinkedMechanismData;
  heraldGreeting?: string;
  bazaarListing?: BazaarListing;
  bazaarPurchase?: {
    listingId: string;
    buyerName: string;
    buyerPeerId: string;
    shardPrice: number;
    itemId: string;
    itemName: string;
  };
  peerChat?: {
    senderName: string;
    text: string;
  };
  isAstralEcho?: boolean;
  visitorState?: {
    level: number;
    archetype: ArchetypeClass;
    inCombat: boolean;
    currentHp?: number;
    maxHp?: number;
    isAstralEcho?: boolean;
  };
}

export interface BrokerSessionInfo {
  roomCode: string;
  hostName: string;
  triChord: string;
  senderId?: string | null;
  heraldGreeting?: string | null;
  hasOffer: boolean;
  hasAnswer: boolean;
  lastSeenMs: number;
}

export type PerspectiveRole = 'EXPLORER' | 'ARCHITECT' | 'SPECTATOR';
export type DrawerTab =
  'NONE' | 'PAPERDOLL' | 'COMBAT_TELEMETRY' | 'REALM_ANALYTICS' | 'CHRONICLE' | 'NETWORK';
export type HeatmapMode = 'TRAFFIC' | 'LETHALITY' | 'TIME_SPENT' | 'LOOT';

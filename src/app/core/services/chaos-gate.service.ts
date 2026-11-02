import { Injectable } from '@angular/core';
import {
  AtmospherePrefix,
  BiomeNoun,
  ChaosGateAddress,
  ConjunctionAnomaly,
  CoreLegendType,
  DeclarativeTrigger,
  ElementalAffinity,
  EquipmentItem,
  ExitDirection,
  MonsterBodyPart,
  MonsterEntity,
  RealmDelta,
  RealmDnaPacket,
  RoomExit,
  RoomNode,
  ServerEraLetter,
  ServerEraMetadata,
  StructuralTheme,
  TopologyPattern,
  TraitProfile,
  TravelerEcho,
} from '../models/domain.models';

export interface ConjunctionIncursionResult {
  incursionId: string;
  newRooms: RoomNode[];
  anchorRoomId: string;
  anchorExitDir: ExitDirection;
  anomaly: ConjunctionAnomaly;
}

export const WILD_CONJUNCTION_ANOMALIES: ConjunctionAnomaly[] = [
  {
    prefix: 'Null-G',
    hazard: 'Gravity Flux Zone',
    mobModifier: 'Phase-Shifting',
    colorHex: '#8b5cf6',
  },
  {
    prefix: 'Corrosive',
    hazard: 'Corrosive Spore Mist',
    mobModifier: 'Acid-Spitting',
    colorHex: '#10b981',
  },
  {
    prefix: 'Superheated',
    hazard: 'Magma Flare Hazard',
    mobModifier: 'Flame-Aura',
    colorHex: '#f97316',
  },
  {
    prefix: 'Sub-Zero',
    hazard: 'Permafrost Glaze',
    mobModifier: 'Crystalline Carapace',
    colorHex: '#38bdf8',
  },
  {
    prefix: 'Prismatic',
    hazard: 'Prismatic Surge',
    mobModifier: 'Resonant Shift',
    colorHex: '#ec4899',
  },
  {
    prefix: 'Temporal',
    hazard: 'Chrono-Fracture Field',
    mobModifier: 'Accelerated',
    colorHex: '#eab308',
  },
  {
    prefix: 'Void-Warped',
    hazard: 'Singularity Well',
    mobModifier: 'Entropic Siphon',
    colorHex: '#6366f1',
  },
  {
    prefix: 'Magnetic',
    hazard: 'Polarity Surge',
    mobModifier: 'Polarized Aegis',
    colorHex: '#14b8a6',
  },
];

export const SERVER_ERAS: Record<ServerEraLetter, ServerEraMetadata> = {
  Δ: { letter: 'Δ', name: 'Delta', levelTier: 1, statMultiplier: 1.0 },
  Θ: { letter: 'Θ', name: 'Theta', levelTier: 5, statMultiplier: 1.35 },
  Λ: { letter: 'Λ', name: 'Lambda', levelTier: 10, statMultiplier: 1.75 },
  Σ: { letter: 'Σ', name: 'Sigma', levelTier: 15, statMultiplier: 2.25 },
  Ω: { letter: 'Ω', name: 'Omega', levelTier: 20, statMultiplier: 3.0 },
};

export const ATMOSPHERE_PREFIXES: AtmospherePrefix[] = [
  'Scorching',
  'Silent',
  'Crystalline',
  'Abyssal',
  'Tempestuous',
  'Blighted',
  'Aetherial',
  'Gilded',
];

export const STRUCTURAL_THEMES: StructuralTheme[] = [
  'Clockwork',
  'Fungal',
  'Monolithic',
  'Labyrinthine',
  'Sunken',
  'Astral',
  'Ossuary',
  'Forge',
];

export const BIOME_NOUNS: BiomeNoun[] = [
  'Catacombs',
  'Observatory',
  'Citadel',
  'Sanctuary',
  'Archive',
  'Spire',
  'Bazaar',
  'Crucible',
];

const ATMOSPHERE_META: Record<
  AtmospherePrefix,
  { element: ElementalAffinity; lighting: string; lootBonus: number; statusFlavor: string }
> = {
  Scorching: {
    element: 'Fire',
    lighting: 'Thermal ember-glow (+15% Fire potency, periodic heat shimmer)',
    lootBonus: 1.15,
    statusFlavor: 'Superheated air primes Burn combos',
  },
  Silent: {
    element: 'Void',
    lighting: 'Acoustic dead-zone (dampened echoes, heightened tactical focus)',
    lootBonus: 1.1,
    statusFlavor: 'Null-sound field amplifies Sunder precision',
  },
  Crystalline: {
    element: 'Frost',
    lighting: 'Prismatic refraction (high visibility, sharp refractive glare)',
    lootBonus: 1.25,
    statusFlavor: 'Sub-zero resonance extends Chill duration',
  },
  Abyssal: {
    element: 'Void',
    lighting: 'Crushing umbral gloom (narrowed sightlines, dense shadow matter)',
    lootBonus: 1.3,
    statusFlavor: 'Abyssal pressure drains exposed stamina',
  },
  Tempestuous: {
    element: 'Lightning',
    lighting: 'Arc-flash strobing (charged ozone, rapid ATB conductive surges)',
    lootBonus: 1.2,
    statusFlavor: 'Ionized atmosphere triggers Overcharge arcs',
  },
  Blighted: {
    element: 'Bio',
    lighting: 'Bioluminescent spore-haze (corrosive mist, mutating flora)',
    lootBonus: 1.18,
    statusFlavor: 'Spore saturation erodes physical armor (Sunder)',
  },
  Aetherial: {
    element: 'Lightning',
    lighting: 'Starlight filament drift (low gravity, lucid ley-lines)',
    lootBonus: 1.35,
    statusFlavor: 'Ley-current accelerates skill cooldown recovery',
  },
  Gilded: {
    element: 'Physical',
    lighting: 'Auric Filigree illumination (opulent vaults, reinforced guardians)',
    lootBonus: 1.5,
    statusFlavor: 'plated vaults yield higher rarity Relics',
  },
};

const THEME_META: Record<
  StructuralTheme,
  {
    topology: TopologyPattern;
    monsterFamily: string[];
    trapFrequency: number;
    puzzleFlavor: string;
  }
> = {
  Clockwork: {
    topology: 'grid-loop',
    monsterFamily: ['Chrono-Automaton', 'Brass Scuttler', 'Gear-Hound', 'Pendulum Sentinel'],
    trapFrequency: 0.45,
    puzzleFlavor: 'Synchronized escapement gears and pressure valves',
  },
  Fungal: {
    topology: 'cluster-spore',
    monsterFamily: ['Mycelial Hulk', 'Spore Weaver', 'Cordyceps Stalker', 'Lichen Shambler'],
    trapFrequency: 0.35,
    puzzleFlavor: 'Symbiotic root barriers sensitive to elemental heat',
  },
  Monolithic: {
    topology: 'cluster-spore',
    monsterFamily: ['Basalt Colossus', 'Runic Golem', 'Obelisk Warden', 'Shard Gargoyle'],
    trapFrequency: 0.25,
    puzzleFlavor: 'Engraved pressure monoliths requiring perceptual alignment',
  },
  Labyrinthine: {
    topology: 'grid-loop',
    monsterFamily: ['Minotaur Revenant', 'Corridor Phantom', 'Mirror Stalker', 'Trap-Spider'],
    trapFrequency: 0.55,
    puzzleFlavor: 'Shifting counterweight walls and illusionary alcoves',
  },
  Sunken: {
    topology: 'deep-descent',
    monsterFamily: ['Trench Leviathan-Spawn', 'Brine Siren', 'Barnacle Knight', 'Abyssal Eel'],
    trapFrequency: 0.3,
    puzzleFlavor: 'Floodgate sluices and hydrostatic lock chambers',
  },
  Astral: {
    topology: 'symmetrical-wing',
    monsterFamily: ['Void Weaver', 'Nebula Seraph', 'Starlight Wraith', 'Comet Construct'],
    trapFrequency: 0.2,
    puzzleFlavor: 'Constellation lens arrays and phase-shift bridges',
  },
  Ossuary: {
    topology: 'deep-descent',
    monsterFamily: ['Marrow Knight', 'Skull Chime Choir', 'Crypt Lich-Thrall', 'Bone Construct'],
    trapFrequency: 0.4,
    puzzleFlavor: 'Ancestral reliquary seals and soul-weight scales',
  },
  Forge: {
    topology: 'grid-loop',
    monsterFamily: ['Slag Behemoth', 'Cinder Artificer', 'Anvil Drake', 'Molten Ingot-Fiend'],
    trapFrequency: 0.5,
    puzzleFlavor: 'Crucible blast-conduits and pneumatic hammer locks',
  },
};

const BIOME_META: Record<
  BiomeNoun,
  {
    roomNouns: string[];
    resourceNode: string;
    hazardName: string;
    bossArchetype: string;
    bossWeakness: ElementalAffinity;
    interactableProp: {
      name: string;
      type: string;
      action: string;
    };
  }
> = {
  Catacombs: {
    roomNouns: [
      'Sepulcher',
      'Vaulted Crypt',
      'Reliquary Crossing',
      'Charnel Nave',
      'Burial Rotunda',
    ],
    resourceNode: 'Ancient Ossuary Cache',
    hazardName: 'Collapsing Crypt Floorplate',
    bossArchetype: 'Arch-Regent of the Deep Crypt',
    bossWeakness: 'Fire',
    interactableProp: {
      name: 'Reliquary Soul-Shrine',
      type: 'shrine',
      action: 'OFFER_TRIBUTE',
    },
  },
  Observatory: {
    roomNouns: [
      'Orrery Dome',
      'Telescope Gallery',
      'Star-Chart Annex',
      'Refraction Hall',
      'Zenith Deck',
    ],
    resourceNode: 'Celestial Lens Capacitor',
    hazardName: 'Focused Solar-Beam Array',
    bossArchetype: 'Panopticon Astromancer',
    bossWeakness: 'Void',
    interactableProp: {
      name: 'Celestial Orrery Terminal',
      type: 'terminal',
      action: 'INSPECT_LORE',
    },
  },
  Citadel: {
    roomNouns: [
      'Bastion Courtyard',
      'Armory Keep',
      'Command Parapet',
      'Siege Gallery',
      'Throne Bulwark',
    ],
    resourceNode: 'Quartermaster Munitions Crate',
    hazardName: 'Automated Murder-Hole Volley',
    bossArchetype: 'Grand Lord-Commander',
    bossWeakness: 'Lightning',
    interactableProp: {
      name: 'Quartermaster Armory Forge',
      type: 'forge',
      action: 'FORGE_ITEM',
    },
  },
  Sanctuary: {
    roomNouns: ['Cloister Garden', 'Choir Nave', 'Votive Font', 'Meditation Apse', 'High Altar'],
    resourceNode: 'Consecrated Incense Brazier',
    hazardName: 'Warding Judgment Sigil',
    bossArchetype: 'Fallen Hierophant',
    bossWeakness: 'Bio',
    interactableProp: {
      name: 'Consecrated Votive Altar',
      type: 'shrine',
      action: 'REST_BLESSING',
    },
  },
  Archive: {
    roomNouns: [
      'Index Rotunda',
      'Scroll Stacks',
      'Memory Vault',
      'Scriptorium Wing',
      'Forbidden Folio Chamber',
    ],
    resourceNode: 'Encrypted Data Crystal',
    hazardName: 'Electro-Static Ward Grid',
    bossArchetype: 'Curator Prime of Lost Lore',
    bossWeakness: 'Fire',
    interactableProp: {
      name: 'Archival Memory Terminal',
      type: 'terminal',
      action: 'INSPECT_LORE',
    },
  },
  Spire: {
    roomNouns: [
      'Ascension Landing',
      'Wind-Bridge',
      'Cloud-Piercer Belfry',
      'Conductor Gallery',
      'Apex Pinnacle',
    ],
    resourceNode: 'Condensed Storm-Core',
    hazardName: 'High-Altitude Gale Shear',
    bossArchetype: 'Sovereign of the Fulminating Peak',
    bossWeakness: 'Frost',
    interactableProp: {
      name: 'Fulminating Conductor Coil',
      type: 'mechanism',
      action: 'SOLVE_PUZZLE',
    },
  },
  Bazaar: {
    roomNouns: [
      'Arcade Concourse',
      'Counting House',
      'Smuggler Alcove',
      'Guild Exchange',
      'Grand Auction Floor',
    ],
    resourceNode: 'Unclaimed Syndicate Strongbox',
    hazardName: 'booby-Trapped Vault Scale',
    bossArchetype: 'Syndicate Underboss Greed-Engine',
    bossWeakness: 'Physical',
    interactableProp: {
      name: 'Smuggler Black-Market Forge',
      type: 'forge',
      action: 'FORGE_ITEM',
    },
  },
  Crucible: {
    roomNouns: [
      'Smelting Pit',
      'Slag Causeway',
      'Quenching Basin',
      'Foundry Core',
      'Titan Mold Chamber',
    ],
    resourceNode: 'Refined Mythril Ingot Pile',
    hazardName: 'Magma Vent Eruption',
    bossArchetype: 'Prime Forgemaster Core',
    bossWeakness: 'Frost',
    interactableProp: {
      name: 'Titan Ingot Smelting Forge',
      type: 'forge',
      action: 'FORGE_ITEM',
    },
  },
};

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
export function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a Chaos Gate string into an unsigned 32-bit integer seed (FNV-1a variant)
 */
export function hashChaosGateSeed(formattedAddress: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < formattedAddress.length; i++) {
    hash ^= formattedAddress.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

@Injectable({
  providedIn: 'root',
})
export class ChaosGateService {
  createAddress(
    era: ServerEraLetter,
    atmosphere: AtmospherePrefix,
    theme: StructuralTheme,
    biome: BiomeNoun,
  ): ChaosGateAddress {
    const formatted = `${era}: ${atmosphere} ${theme} ${biome}`;
    return {
      era,
      atmosphere,
      theme,
      biome,
      formatted,
      seed: hashChaosGateSeed(formatted),
    };
  }

  parseAddressString(input: string): ChaosGateAddress | null {
    const cleaned = input.trim();
    const match = cleaned.match(/^([ΔΘΛΣΩ]):\s+(\w+)\s+(\w+)\s+(\w+)$/);
    if (!match) return null;
    const [, eraRaw, atmoRaw, themeRaw, biomeRaw] = match;
    const era = eraRaw as ServerEraLetter;
    const atmosphere = ATMOSPHERE_PREFIXES.find((a) => a.toLowerCase() === atmoRaw.toLowerCase());
    const theme = STRUCTURAL_THEMES.find((t) => t.toLowerCase() === themeRaw.toLowerCase());
    const biome = BIOME_NOUNS.find((b) => b.toLowerCase() === biomeRaw.toLowerCase());
    if (!atmosphere || !theme || !biome) return null;
    return this.createAddress(era, atmosphere, theme, biome);
  }

  /**
   * Generates the 6-room Primordial Sanctum that serves as the player's persistent Home Dungeon,
   * uncoupling starting realm creation from a single rigid 3-word seed.
   */
  generatePrimordialSanctum(era: ServerEraLetter = 'Δ', ownerName = 'Aegis_Architect'): RoomNode[] {
    const eraMeta = SERVER_ERAS[era] || SERVER_ERAS['Δ'];
    return [
      {
        id: 'room-0',
        title: 'Primordial Anchor Chamber',
        description: `The luminous core of ${ownerName}'s Pocket Realm. Here, the Primordial Anchor hums in quiet harmony with the cosmos, tethered to the Wayfinder Loom.`,
        x: 460,
        y: 320,
        depthTier: 1,
        legendType: 'anchor-portal',
        atmosphereEffect: 'Aetherial Starlight — Primordial Nexus',
        elementalMutator: 'Lightning',
        atmospherePrefix: 'Aetherial',
        structuralTheme: 'Astral',
        biomeNoun: 'Sanctuary',
        exits: [
          { direction: 'N', targetRoomId: 'room-1' },
          { direction: 'E', targetRoomId: 'room-2' },
          { direction: 'W', targetRoomId: 'room-3' },
        ],
        monsters: [],
        items: [],
        triggers: [],
        rumorSignal: 'Looming resonance of the Primordial Anchor',
        propInteractable: {
          name: 'Wayfinder Loom Nexus',
          type: 'terminal',
          action: 'INSPECT_LORE',
          solved: false,
        },
      },
      {
        id: 'room-1',
        title: 'Sanctum Nave',
        description:
          'An open corridor of vaulted celestial stone where faint cosmic murmurs filter through ancient starlight.',
        x: 460,
        y: 190,
        depthTier: 1,
        legendType: 'corridor',
        atmosphereEffect: 'Null-sound acoustic calm',
        elementalMutator: 'Void',
        atmospherePrefix: 'Silent',
        structuralTheme: 'Astral',
        biomeNoun: 'Catacombs',
        exits: [
          { direction: 'S', targetRoomId: 'room-0' },
          { direction: 'N', targetRoomId: 'room-4' },
        ],
        monsters: [
          {
            id: 'mob-sanctum-sentry',
            templateId: 'sanctum-automaton',
            name: 'Primordial Practice Sentry',
            level: 1,
            isBoss: false,
            hp: 60,
            maxHp: 60,
            atk: 5,
            mitigationPct: 5,
            speed: 8,
            atbGauge: 0,
            element: 'Void',
            weakness: 'Fire',
            statuses: [],
            loreSnippet: 'A celestial training construct to hone combat reflexes.',
            secretWeaknessHint: 'Vulnerable to Fire.',
            lootTable: [],
          },
        ],
        items: [],
        triggers: [],
        rumorSignal: 'Faint chanting in the nave',
        tombstones: [
          {
            id: 'tomb-caelum-nave',
            slainPlayerName: 'Vanguard_Caelum',
            slainBy: 'Sanctum Automaton',
            epitaph:
              'To tread the clockwork path is to court the turning of the wheel. Honor the fallen with resonance.',
            timestamp: 1730419200000,
            tributeCount: 3,
          },
        ],
      },
      {
        id: 'room-2',
        title: 'Aegis Armory',
        description:
          'A fortified vault chamber lined with primordial forge-racks and rune-inscribed armaments.',
        x: 620,
        y: 320,
        depthTier: 1,
        legendType: 'treasure-vault',
        atmosphereEffect: 'Auric Filigree glow',
        elementalMutator: 'Physical',
        atmospherePrefix: 'Gilded',
        structuralTheme: 'Forge',
        biomeNoun: 'Crucible',
        exits: [
          { direction: 'W', targetRoomId: 'room-0' },
          { direction: 'N', targetRoomId: 'room-5' },
        ],
        monsters: [],
        items: [
          {
            id: 'item-sanctum-blade',
            name: 'Primordial Vanguard Blade',
            slot: 'Main-Hand',
            rarity: 'Rare',
            weight: 3,
            provenance: 'Verified Drop',
            originGateAddress: `${era}: Aetherial Astral Sanctuary`,
            statBonuses: { atkBonus: 6 },
            totalStatBudget: 14,
          },
        ],
        triggers: [],
        rumorSignal: 'Metallic sheen from the armory',
        propInteractable: {
          name: 'Quartermaster Armory Forge',
          type: 'forge',
          action: 'FORGE_ITEM',
          solved: false,
        },
        bazaar: [
          {
            id: 'bazaar-starter-relic',
            sellerName: 'Warden_Althea',
            sellerAddress: `${era}: Aetherial Astral Sanctuary`,
            shardPrice: 15,
            listedAt: Date.now() - 7200000,
            item: {
              id: 'item-shadow-pauldrons',
              name: 'Shadow-Woven Pauldrons',
              slot: 'Chest',
              rarity: 'Relic',
              weight: 4,
              provenance: 'Verified Drop',
              originGateAddress: `${era}: Aetherial Astral Sanctuary`,
              statBonuses: { mitigationBonus: 7, speedPctBonus: 8, DEX: 3 },
              totalStatBudget: 18,
              provenanceChain: [
                {
                  action: 'Forged',
                  architect: 'Warden_Althea',
                  realm: `${era}: Aetherial Astral Sanctuary`,
                  timestamp: Date.now() - 7200000,
                  price: 15,
                },
              ],
            },
          },
        ],
      },
      {
        id: 'room-3',
        title: 'Archive of Beginnings',
        description:
          'A quiet gallery lined with crystalline memory folios documenting the dawn of the realms.',
        x: 300,
        y: 320,
        depthTier: 1,
        legendType: 'lore-terminal',
        atmosphereEffect: 'Prismatic crystal refraction',
        elementalMutator: 'Frost',
        atmospherePrefix: 'Crystalline',
        structuralTheme: 'Monolithic',
        biomeNoun: 'Archive',
        exits: [{ direction: 'E', targetRoomId: 'room-0' }],
        monsters: [],
        items: [],
        triggers: [],
        rumorSignal: 'Glint of crystalline memory glyphs',
        grimoire: {
          id: 'grim-starter-codex',
          title: 'Codex of the Linked Realmlords',
          authorName: 'Wayfinder_Archivist',
          pages: [
            'Welcome, traveler, to the Linked Pocket Realms. Each realm is a living domain anchored by its Tri-Chord: Atmosphere, Architecture, and Biome.',
            'When two Wayfinders pass near one another with their realms open, the dimensional membranes resonate. Rooms cross-pollinate, creating hybrid incursion chambers with dual themes.',
            'Leave your own mark upon these halls: inscribe runes upon the flagstones with @inscribe, leave your words in the lectern grimoires with @book write, and honor fallen wanderers at their memorial stones.',
          ],
          createdAt: 1730419200000,
        },
        propInteractable: {
          name: 'Archival Memory Terminal',
          type: 'terminal',
          action: 'INSPECT_LORE',
          solved: false,
        },
      },
      {
        id: 'room-4',
        title: 'Sanctuary Font',
        description:
          'A calm inner alcove with a font of soothing revitalizing waters, protected from outside incursions.',
        x: 460,
        y: 70,
        depthTier: 2,
        legendType: 'safe-campfire',
        atmosphereEffect: 'Restorative Ley-current',
        elementalMutator: 'Bio',
        atmospherePrefix: 'Aetherial',
        structuralTheme: 'Astral',
        biomeNoun: 'Sanctuary',
        exits: [{ direction: 'S', targetRoomId: 'room-1' }],
        monsters: [],
        items: [],
        triggers: [],
        rumorSignal: 'Luminescence of the sacred font',
        propInteractable: {
          name: 'Consecrated Votive Altar',
          type: 'shrine',
          action: 'REST_BLESSING',
          solved: false,
        },
      },
      {
        id: 'room-5',
        title: 'Primordial Threshold',
        description:
          'The outer boundary of the Sanctum. Beyond these warded archways lie the unshaped cosmic mists awaiting the Conjunction of the Spheres.',
        x: 620,
        y: 190,
        depthTier: 2,
        legendType: 'elite-boss',
        atmosphereEffect: 'Ionized arc-flash strobing',
        elementalMutator: 'Lightning',
        atmospherePrefix: 'Tempestuous',
        structuralTheme: 'Clockwork',
        biomeNoun: 'Citadel',
        exits: [{ direction: 'S', targetRoomId: 'room-2' }],
        monsters: [
          {
            id: 'mob-sanctum-warden',
            templateId: 'primordial-warden',
            name: 'Primordial Sanctum Warden',
            level: eraMeta.levelTier + 1,
            isBoss: true,
            hp: Math.round(140 * eraMeta.statMultiplier),
            maxHp: Math.round(140 * eraMeta.statMultiplier),
            atk: Math.round(12 * eraMeta.statMultiplier),
            mitigationPct: 15,
            speed: 10,
            atbGauge: 0,
            element: 'Lightning',
            weakness: 'Fire',
            statuses: [],
            loreSnippet: 'An ancient starlight automaton sworn to protect the Primordial Sanctum.',
            secretWeaknessHint: 'Vulnerable to Fire damage.',
            lootTable: [
              {
                id: 'item-sanctum-sigil',
                name: 'Primordial Warden Sigil',
                slot: 'Off-Hand',
                rarity: 'Rare',
                weight: 2,
                provenance: 'Verified Drop',
                originGateAddress: `${era}: Aetherial Astral Sanctuary`,
                statBonuses: { mitigationBonus: 6 },
                totalStatBudget: 16,
              },
            ],
          },
        ],
        items: [],
        triggers: [],
        rumorSignal: 'Humming ward at the Primordial Threshold',
        linkedMechanism: {
          id: 'mech-primordial-conduit',
          name: 'Twin Chrono-Resonance Conduit',
          state: 'LOCKED',
          activatedByLocal: false,
          activatedByRemote: false,
          rewardClaimed: false,
        },
      },
    ];
  }

  /**
   * Calculates the dynamic TraitProfile (weighted histogram of atmospheres, architectures, and biomes)
   * across all currently active/kept rooms in the player's persistent Home Dungeon.
   */
  computeTraitProfile(rooms: RoomNode[]): TraitProfile {
    const homeRooms = rooms.filter((r) => !r.isExpedition);
    const atmospheres: Record<AtmospherePrefix, number> = {
      Scorching: 0,
      Silent: 0,
      Crystalline: 0,
      Abyssal: 0,
      Tempestuous: 0,
      Blighted: 0,
      Aetherial: 0,
      Gilded: 0,
    };
    const architectures: Record<StructuralTheme, number> = {
      Clockwork: 0,
      Fungal: 0,
      Monolithic: 0,
      Labyrinthine: 0,
      Sunken: 0,
      Astral: 0,
      Ossuary: 0,
      Forge: 0,
    };
    const biomes: Record<BiomeNoun, number> = {
      Catacombs: 0,
      Observatory: 0,
      Citadel: 0,
      Sanctuary: 0,
      Archive: 0,
      Spire: 0,
      Bazaar: 0,
      Crucible: 0,
    };

    for (const r of homeRooms) {
      if (r.atmospherePrefix && atmospheres[r.atmospherePrefix] !== undefined) {
        atmospheres[r.atmospherePrefix]++;
      } else {
        atmospheres['Aetherial']++;
      }
      if (r.structuralTheme && architectures[r.structuralTheme] !== undefined) {
        architectures[r.structuralTheme]++;
      } else {
        architectures['Clockwork']++;
      }
      if (r.biomeNoun && biomes[r.biomeNoun] !== undefined) {
        biomes[r.biomeNoun]++;
      } else {
        biomes['Sanctuary']++;
      }
    }

    const findMax = <T extends string>(record: Record<T, number>, fallback: T): T => {
      let bestKey = fallback;
      let bestVal = -1;
      for (const [key, val] of Object.entries(record) as [T, number][]) {
        if (val > bestVal) {
          bestVal = val;
          bestKey = key;
        }
      }
      return bestKey;
    };

    return {
      atmospheres,
      architectures,
      biomes,
      primaryAtmosphere: findMax(atmospheres, 'Aetherial'),
      primaryArchitecture: findMax(architectures, 'Clockwork'),
      primaryBiome: findMax(biomes, 'Sanctuary'),
      totalRooms: homeRooms.length,
    };
  }

  /**
   * Deterministically generates the baseline Pocket Realm from the 3-Word Chaos Gate Address,
   * then applies the lightweight JSON RealmDelta overlay if present.
   */
  generateRealm(address: ChaosGateAddress, delta?: RealmDelta): RoomNode[] {
    const prng = createMulberry32(address.seed);
    const eraMeta = SERVER_ERAS[address.era];
    const atmoMeta = ATMOSPHERE_META[address.atmosphere];
    const themeMeta = THEME_META[address.theme];
    const biomeMeta = BIOME_META[address.biome];

    // Generate 8 deterministic baseline rooms
    const roomCount = 8;
    const rooms: RoomNode[] = [];

    const coords = this.computeTopologyCoords(themeMeta.topology, roomCount);

    const legendSequence: CoreLegendType[] = [
      'anchor-portal',
      'corridor',
      'lore-terminal',
      'hazard-trap',
      'puzzle-mechanism',
      'safe-campfire',
      'treasure-vault',
      'elite-boss',
    ];

    for (let i = 0; i < roomCount; i++) {
      const roomId = `room-${i}`;
      const legendType = legendSequence[i] ?? 'corridor';
      const noun = biomeMeta.roomNouns[i % biomeMeta.roomNouns.length];
      const title =
        i === 0
          ? `${address.era} Chaos Gate Anchor`
          : i === roomCount - 1
            ? `Sanctum of the ${biomeMeta.bossArchetype}`
            : `${address.atmosphere} ${address.theme} ${noun} ${i}`;

      const description = this.buildRoomDescription(
        i,
        address,
        atmoMeta.lighting,
        themeMeta.puzzleFlavor,
        biomeMeta.resourceNode,
        biomeMeta.hazardName,
      );

      const monsters: MonsterEntity[] = [];
      const items: EquipmentItem[] = [];
      const triggers: DeclarativeTrigger[] = [];

      // Populate monsters deterministically
      if (legendType === 'elite-boss') {
        monsters.push(this.createBossMonster(address, eraMeta, atmoMeta.element, biomeMeta, prng));
      } else if (
        legendType !== 'anchor-portal' &&
        legendType !== 'safe-campfire' &&
        (prng() < 0.65 || i === 1 || i === 3)
      ) {
        const family = themeMeta.monsterFamily;
        const mName = family[Math.floor(prng() * family.length)];
        monsters.push(
          this.createRegularMonster(
            `mob-${i}-0`,
            mName,
            eraMeta,
            atmoMeta.element,
            biomeMeta.bossWeakness,
            address.formatted,
            prng,
            address.atmosphere,
          ),
        );
      }

      // Populate treasure or lore items
      if (legendType === 'treasure-vault' || (legendType === 'lore-terminal' && prng() < 0.7)) {
        items.push(this.createDeterministicItem(`item-room-${i}`, address, eraMeta, prng, false));
      }

      // Populate declarative triggers on puzzle or hazard rooms
      if (legendType === 'puzzle-mechanism') {
        triggers.push({
          id: `trig-puzzle-${i}`,
          when: 'ON_INSPECT',
          ifCondition: 'PER >= 10',
          doAction: 'UNLOCK_EXIT',
          actionPayload: 'room-6',
        });
      } else if (legendType === 'hazard-trap' && prng() < themeMeta.trapFrequency + 0.3) {
        triggers.push({
          id: `trig-hazard-${i}`,
          when: 'ON_ENTER',
          ifCondition: 'ALWAYS',
          doAction: 'DEAL_HAZARD',
          actionPayload: `${biomeMeta.hazardName}:12`,
        });
      }

      // Populate interactable prop on mechanism, vault, or lore terminal rooms
      let propInteractable = undefined;
      if (
        legendType === 'puzzle-mechanism' ||
        legendType === 'lore-terminal' ||
        legendType === 'treasure-vault' ||
        i === 4
      ) {
        propInteractable = {
          name: biomeMeta.interactableProp.name,
          type: biomeMeta.interactableProp.type,
          action: biomeMeta.interactableProp.action,
          solved: false,
        };
      }

      rooms.push({
        id: roomId,
        title,
        description,
        x: coords[i].x,
        y: coords[i].y,
        depthTier: i,
        legendType,
        atmosphereEffect: `${atmoMeta.lighting} — ${atmoMeta.statusFlavor}`,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        exits: [],
        monsters,
        items,
        triggers,
        rumorSignal: this.buildRumorSignal(legendType, address, biomeMeta),
        growthStage: 1,
        propInteractable,
      });
    }

    // Wire topology edges based on Word 2 (Structural Theme)
    this.wireTopologyExits(rooms, themeMeta.topology);

    // Apply JSON Delta Layer overrides if provided
    if (delta) {
      return this.applyDeltaLayer(rooms, delta, address);
    }

    return rooms;
  }

  private computeTopologyCoords(
    pattern: TopologyPattern,
    count: number,
  ): { x: number; y: number }[] {
    if (pattern === 'grid-loop') {
      return [
        { x: 180, y: 320 }, // room-0: Anchor Gateway
        { x: 180, y: 160 }, // room-1: North Concourse
        { x: 460, y: 160 }, // room-2: Lever Chamber
        { x: 460, y: 320 }, // room-3: Central Junction
        { x: 740, y: 160 }, // room-4: North-East Crossway
        { x: 740, y: 320 }, // room-5: East Campfire
        { x: 740, y: 480 }, // room-6: South-East Vault
        { x: 460, y: 480 }, // room-7: Apex Boss Sanctum
      ];
    }

    if (pattern === 'deep-descent') {
      return [
        { x: 460, y: 80 }, // room-0: Surface Anchor
        { x: 300, y: 160 }, // room-1: Upper Crypt
        { x: 620, y: 160 }, // room-2: Upper Reliquary
        { x: 460, y: 260 }, // room-3: Sub-level Descent Hub
        { x: 290, y: 340 }, // room-4: Flooded Ossuary
        { x: 630, y: 340 }, // room-5: Safe Grotto Campfire
        { x: 460, y: 430 }, // room-6: Deep Abyssal Vault
        { x: 460, y: 520 }, // room-7: Abyssal Boss Throne
      ];
    }

    if (pattern === 'cluster-spore') {
      return [
        { x: 460, y: 280 }, // room-0: Central Spore Hub
        { x: 460, y: 140 }, // room-1: North Pod
        { x: 320, y: 80 }, // room-2: Spore Nursery
        { x: 240, y: 390 }, // room-3: South-West Pod
        { x: 110, y: 460 }, // room-4: Bioluminescent Terminal
        { x: 680, y: 390 }, // room-5: South-East Campfire Pod
        { x: 810, y: 460 }, // room-6: Spore Vault
        { x: 690, y: 130 }, // room-7: Mycelial Boss Core
      ];
    }

    if (pattern === 'symmetrical-wing') {
      return [
        { x: 460, y: 500 }, // room-0: Grand Gate Anchor
        { x: 460, y: 370 }, // room-1: Central Nave
        { x: 460, y: 230 }, // room-2: High Altar of Trials
        { x: 230, y: 370 }, // room-3: Left Trial Transept
        { x: 130, y: 230 }, // room-4: Left Trial Chamber
        { x: 690, y: 370 }, // room-5: Right Trial Transept
        { x: 790, y: 230 }, // room-6: Right Trial Chamber
        { x: 460, y: 80 }, // room-7: Sealed Apex Sanctum
      ];
    }

    if (pattern === 'ring') {
      const cx = 460;
      const cy = 280;
      const rx = 280;
      const ry = 180;
      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        return {
          x: Math.round(cx + Math.cos(angle) * rx),
          y: Math.round(cy + Math.sin(angle) * ry),
        };
      });
    }

    if (pattern === 'hub-and-spoke') {
      const coords: { x: number; y: number }[] = [{ x: 460, y: 280 }]; // Center hub
      for (let i = 1; i < count; i++) {
        const angle = ((i - 1) / (count - 1)) * Math.PI * 2 - Math.PI / 2;
        coords.push({
          x: Math.round(460 + Math.cos(angle) * 290),
          y: Math.round(280 + Math.sin(angle) * 195),
        });
      }
      return coords;
    }

    if (pattern === 'tower') {
      return [
        { x: 460, y: 510 },
        { x: 320, y: 430 },
        { x: 600, y: 430 },
        { x: 460, y: 340 },
        { x: 310, y: 250 },
        { x: 610, y: 250 },
        { x: 460, y: 165 },
        { x: 460, y: 75 },
      ];
    }

    // Default: branching labyrinth
    return [
      { x: 130, y: 280 },
      { x: 280, y: 160 },
      { x: 280, y: 400 },
      { x: 460, y: 160 },
      { x: 460, y: 280 },
      { x: 460, y: 410 },
      { x: 660, y: 190 },
      { x: 810, y: 280 },
    ];
  }

  private wireTopologyExits(rooms: RoomNode[], pattern: TopologyPattern): void {
    const link = (
      aIdx: number,
      bIdx: number,
      dirAB: ExitDirection,
      dirBA: ExitDirection,
      opts?: { isSecret?: boolean; isLocked?: boolean; requiredKeyId?: string },
    ) => {
      const a = rooms[aIdx];
      const b = rooms[bIdx];
      if (!a || !b) return;
      if (!a.exits.some((e) => e.targetRoomId === b.id)) {
        a.exits.push({
          direction: dirAB,
          targetRoomId: b.id,
          isSecret: opts?.isSecret,
          isLocked: opts?.isLocked,
          requiredKeyId: opts?.requiredKeyId,
        });
      }
      if (!b.exits.some((e) => e.targetRoomId === a.id)) {
        b.exits.push({
          direction: dirBA,
          targetRoomId: a.id,
        });
      }
    };

    if (pattern === 'grid-loop') {
      // 2D grid loops with locked cross-corridors and shortcut levers
      link(0, 1, 'N', 'S');
      link(0, 3, 'E', 'W');
      link(1, 2, 'E', 'W');
      link(2, 3, 'S', 'N');
      link(2, 4, 'E', 'W');
      link(3, 5, 'E', 'W', { isLocked: true, requiredKeyId: 'shortcut-lever' });
      link(4, 5, 'S', 'N');
      link(5, 6, 'S', 'N');
      link(3, 7, 'S', 'N', { isSecret: true });
      link(6, 7, 'W', 'E');
      return;
    }

    if (pattern === 'deep-descent') {
      // Multi-stratum vertical layout with Down/Up stairwells
      link(0, 1, 'W', 'E');
      link(0, 2, 'E', 'W');
      link(1, 3, 'D', 'U');
      link(2, 3, 'D', 'U');
      link(3, 4, 'W', 'E');
      link(3, 5, 'E', 'W');
      link(4, 6, 'D', 'U');
      link(5, 6, 'D', 'U', { isSecret: true });
      link(6, 7, 'D', 'U');
      return;
    }

    if (pattern === 'cluster-spore') {
      // Organic central hub with radiating 3-room spore pods
      link(0, 1, 'N', 'S');
      link(0, 3, 'W', 'E');
      link(0, 5, 'E', 'W');
      link(1, 2, 'W', 'E');
      link(3, 4, 'W', 'E');
      link(5, 6, 'E', 'W');
      link(1, 7, 'E', 'W', { isLocked: true });
      link(6, 7, 'N', 'S', { isSecret: true });
      return;
    }

    if (pattern === 'symmetrical-wing') {
      // Grand central nave flanked by Left/Right trial wings unsealing Boss Sanctum
      link(0, 1, 'N', 'S');
      link(1, 2, 'N', 'S');
      link(1, 3, 'W', 'E');
      link(3, 4, 'N', 'S');
      link(4, 2, 'E', 'W');
      link(1, 5, 'E', 'W');
      link(5, 6, 'N', 'S');
      link(6, 2, 'W', 'E');
      link(2, 7, 'N', 'S', { isLocked: true, requiredKeyId: 'sanctum-seal' });
      return;
    }

    if (pattern === 'ring') {
      link(0, 1, 'E', 'W');
      link(1, 2, 'S', 'N');
      link(2, 3, 'S', 'N');
      link(3, 4, 'W', 'E');
      link(4, 5, 'W', 'E');
      link(5, 6, 'N', 'S');
      link(6, 7, 'E', 'W');
      link(7, 0, 'E', 'W', { isSecret: true });
      link(4, 7, 'N', 'S');
      return;
    }

    if (pattern === 'hub-and-spoke') {
      link(0, 1, 'N', 'S');
      link(0, 2, 'E', 'W');
      link(0, 3, 'S', 'N');
      link(0, 5, 'W', 'E');
      link(1, 4, 'E', 'W');
      link(4, 6, 'S', 'N', { isSecret: true });
      link(5, 7, 'N', 'S');
      return;
    }

    if (pattern === 'tower') {
      link(0, 1, 'W', 'E');
      link(0, 2, 'E', 'W');
      link(1, 3, 'U', 'D');
      link(2, 3, 'U', 'D');
      link(3, 4, 'W', 'E');
      link(3, 5, 'E', 'W');
      link(4, 6, 'U', 'D', { isSecret: true });
      link(5, 6, 'U', 'D');
      link(6, 7, 'U', 'D');
      return;
    }

    // Labyrinth
    link(0, 1, 'N', 'S');
    link(0, 2, 'S', 'N');
    link(1, 3, 'E', 'W');
    link(2, 5, 'E', 'W');
    link(3, 4, 'S', 'N');
    link(4, 5, 'S', 'N');
    link(4, 6, 'E', 'W', { isSecret: true });
    link(5, 7, 'E', 'W');
    link(6, 7, 'S', 'N');
  }

  private buildRoomDescription(
    index: number,
    address: ChaosGateAddress,
    lighting: string,
    puzzleFlavor: string,
    resourceNode: string,
    hazardName: string,
  ): string {
    if (index === 0) {
      return `The resonating Chaos Gate ring of [${address.formatted}] hums with ${address.atmosphere.toLowerCase()} energy. ${lighting}. Travelers materialize here before descending into the ${address.biome.toLowerCase()}.`;
    }
    if (index === 2) {
      return `An ancient data monolith rises amidst ${address.theme.toLowerCase()} architecture. Nearby rests a ${resourceNode}, humming with archived telemetry.`;
    }
    if (index === 3) {
      return `Caution: ${hazardName} scars the masonry here. ${lighting}. Every footstep echoes through the ${address.biome.toLowerCase()}.`;
    }
    if (index === 4) {
      return `Intricate ${puzzleFlavor} govern the sealed vault doors ahead. High Perception may reveal the hidden bypass mechanism.`;
    }
    if (index === 5) {
      return `A sheltered sanctuary campfire burns with steady azure flame, warding back the ${address.atmosphere.toLowerCase()} pressure of the realm.`;
    }
    if (index === 7) {
      return `The apex chamber of ${address.formatted}. Colossal ${address.theme.toLowerCase()} pillars frame the throne where the Realm Boss awaits challengers.`;
    }
    return `A ${address.atmosphere.toLowerCase()} passage carved in ${address.theme.toLowerCase()} style within the ${address.biome.toLowerCase()}. ${lighting}.`;
  }

  private buildRumorSignal(
    legendType: CoreLegendType,
    address: ChaosGateAddress,
    biomeMeta: { resourceNode: string; hazardName: string; bossArchetype: string },
  ): string {
    switch (legendType) {
      case 'elite-boss':
        return `WARNING: Massive ${address.atmosphere} resonance signature (${biomeMeta.bossArchetype})`;
      case 'safe-campfire':
        return `Signal: Thermal sanctuary signature detected ahead`;
      case 'treasure-vault':
        return `Signal: High-density Relic signature (${biomeMeta.resourceNode})`;
      case 'hazard-trap':
        return `Caution: Elevated environmental hazard readings (${biomeMeta.hazardName})`;
      case 'puzzle-mechanism':
        return `Signal: Mechanical lock resonance (${address.theme} mechanism)`;
      default:
        return `Uncharted ${address.theme} sector`;
    }
  }

  private createRegularMonster(
    id: string,
    name: string,
    eraMeta: ServerEraMetadata,
    element: ElementalAffinity,
    weakness: ElementalAffinity,
    gateAddress: string,
    prng: () => number,
    atmospherePrefix?: AtmospherePrefix | string,
  ): MonsterEntity {
    const baseHp = Math.round((55 + Math.floor(prng() * 25)) * eraMeta.statMultiplier);
    const atk = Math.round((11 + Math.floor(prng() * 5)) * eraMeta.statMultiplier);
    const adj = atmospherePrefix || 'Scorching';
    const targetableParts: MonsterBodyPart[] = [];
    if (prng() < 0.6) {
      targetableParts.push({
        id: `part-${id}-joint`,
        name: 'Servo Joint',
        hp: Math.max(10, Math.round(baseHp * 0.45)),
        maxHp: Math.max(10, Math.round(baseHp * 0.45)),
        isSevered: false,
        debuffAppliedOnBreak: '-25% Speed & Stunned',
        partEffectDescription: 'Locomotion assembly; breaking causes kinetic stagger.',
      });
    }
    return {
      id,
      templateId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: `${adj} ${name}`,
      level: eraMeta.levelTier + Math.floor(prng() * 2),
      isBoss: false,
      hp: baseHp,
      maxHp: baseHp,
      atk,
      mitigationPct: 10 + Math.floor(prng() * 10),
      speed: 10 + Math.floor(prng() * 6),
      atbGauge: Math.floor(prng() * 35),
      element,
      weakness,
      statuses: [],
      adjectives: [adj],
      loreSnippet: `A native ${adj.toLowerCase()} ${name} adapted to ${gateAddress}.`,
      secretWeaknessHint: `Structural joints destabilize when struck by ${weakness} or Sunder combos.`,
      lootTable: [],
      targetableParts,
    };
  }

  private createBossMonster(
    address: ChaosGateAddress,
    eraMeta: ServerEraMetadata,
    element: ElementalAffinity,
    biomeMeta: { bossArchetype: string; bossWeakness: ElementalAffinity },
    prng: () => number,
  ): MonsterEntity {
    const maxHp = Math.round(160 * eraMeta.statMultiplier);
    const atk = Math.round(20 * eraMeta.statMultiplier);
    const bossDrop = this.createDeterministicItem(
      `boss-relic-${address.seed}`,
      address,
      eraMeta,
      prng,
      true,
    );
    const targetableParts: MonsterBodyPart[] = [
      {
        id: `part-${address.seed}-core`,
        name: 'Core Dynamo',
        hp: Math.max(20, Math.round(maxHp * 0.35)),
        maxHp: Math.max(20, Math.round(maxHp * 0.35)),
        isSevered: false,
        debuffAppliedOnBreak: '-35% Atk & Silenced',
        partEffectDescription:
          'Channels planar discharge; severing disables high-threat burst attacks.',
      },
      {
        id: `part-${address.seed}-carapace`,
        name: 'Aegis Carapace',
        hp: Math.max(18, Math.round(maxHp * 0.3)),
        maxHp: Math.max(18, Math.round(maxHp * 0.3)),
        isSevered: false,
        debuffAppliedOnBreak: '-50% Mitigation (Vulnerable)',
        partEffectDescription: 'Heavy defensive plating; breaking exposes raw vulnerable conduits.',
      },
      {
        id: `part-${address.seed}-blade`,
        name: 'Scythe Limb',
        hp: Math.max(15, Math.round(maxHp * 0.25)),
        maxHp: Math.max(15, Math.round(maxHp * 0.25)),
        isSevered: false,
        debuffAppliedOnBreak: '-30% Speed & Stagger',
        partEffectDescription: 'Kinetic striker; fracturing slows movement cadence.',
      },
    ];
    return {
      id: `boss-${address.seed}`,
      templateId: biomeMeta.bossArchetype.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: `${address.atmosphere} ${biomeMeta.bossArchetype}`,
      level: eraMeta.levelTier + 3,
      isBoss: true,
      hp: maxHp,
      maxHp,
      atk,
      mitigationPct: 22,
      speed: 14,
      atbGauge: 20,
      element,
      weakness: biomeMeta.bossWeakness,
      statuses: [],
      adjectives: [address.atmosphere],
      loreSnippet: `Supreme guardian of ${address.formatted}, bound to the Chaos Gate core.`,
      secretWeaknessHint: `Core shielding collapses under ${biomeMeta.bossWeakness} elemental bursts while Sundered.`,
      lootTable: [bossDrop],
      targetableParts,
    };
  }

  createDeterministicItem(
    id: string,
    address: ChaosGateAddress,
    eraMeta: ServerEraMetadata,
    prng: () => number,
    isBossRelic: boolean,
  ): EquipmentItem {
    const slots: EquipmentItem['slot'][] = [
      'Main-Hand',
      'Off-Hand',
      'Head',
      'Chest',
      'Legs',
      'Relic 1',
      'Relic 2',
    ];
    const slot = isBossRelic ? 'Main-Hand' : slots[Math.floor(prng() * slots.length)];
    const mult = eraMeta.statMultiplier * (isBossRelic ? 1.5 : 1.0);
    const strBonus = Math.max(1, Math.round((2 + Math.floor(prng() * 4)) * mult));
    const dexBonus = Math.max(1, Math.round((1 + Math.floor(prng() * 4)) * mult));
    const intBonus = Math.max(1, Math.round((1 + Math.floor(prng() * 4)) * mult));
    const atkBonus = Math.max(2, Math.round((4 + Math.floor(prng() * 6)) * mult));
    const speedPctBonus = Math.round((2 + Math.floor(prng() * 5)) * (isBossRelic ? 1.5 : 1));
    const totalStatBudget = strBonus + dexBonus + intBonus + atkBonus + speedPctBonus;

    return {
      id,
      name: isBossRelic
        ? `${address.era} Sovereign ${address.theme} Blade`
        : `${address.atmosphere} ${address.theme} ${slot}`,
      slot,
      rarity: isBossRelic ? 'Mythic' : prng() > 0.5 ? 'Relic' : 'Rare',
      weight: isBossRelic ? 6 : 4,
      provenance: 'Verified Drop',
      originGateAddress: address.formatted,
      statBonuses: {
        STR: strBonus,
        DEX: dexBonus,
        INT: intBonus,
        atkBonus,
        speedPctBonus,
      },
      totalStatBudget,
    };
  }

  /**
   * Generates a hybrid Conjunction of the Spheres incursion wing using a 3-way genetic blend:
   * 40% Host A (Local Border traits)
   * 40% Host B (Remote Peer traits)
   * 20% Wild Conjunction Anomaly (Emergent prefix, hazard, and mob modifier)
   * Respects 30-room maximum capacity limit.
   */
  generateConjunctionIncursion(
    localAddress: ChaosGateAddress,
    remoteAddress: ChaosGateAddress,
    remoteOwner: string,
    existingRooms: RoomNode[],
    conjunctionCount = 0,
    remoteEcho?: TravelerEcho,
    remoteProfile?: TraitProfile,
  ): ConjunctionIncursionResult {
    const MAX_REALM_ROOMS = 30;
    const availableSlots = Math.max(0, MAX_REALM_ROOMS - existingRooms.length);
    if (availableSlots <= 0) {
      return {
        incursionId: `inc-capped-${Date.now().toString(36)}`,
        newRooms: [],
        anchorRoomId: existingRooms[0]?.id || 'room-0',
        anchorExitDir: 'E',
        anomaly: WILD_CONJUNCTION_ANOMALIES[0],
      };
    }

    // Deterministic splicing of both realm DNA seeds
    const splicedSeed =
      (localAddress.seed ^ remoteAddress.seed ^ ((conjunctionCount + 1) * 0x5f3759df)) >>> 0;
    const prng = createMulberry32(splicedSeed);
    const incursionId = `conj-${splicedSeed.toString(36)}`;

    // 20% Wild Conjunction Anomaly selection
    const anomalyIdx = ((splicedSeed ^ conjunctionCount) >>> 0) % WILD_CONJUNCTION_ANOMALIES.length;
    const anomaly = WILD_CONJUNCTION_ANOMALIES[anomalyIdx] || WILD_CONJUNCTION_ANOMALIES[0];

    // Pick an anchor room from outer/deeper existing rooms that has free cardinal exits
    const candidateRooms = [...existingRooms].reverse();
    const cardinalDirs: ExitDirection[] = ['E', 'S', 'W', 'N'];
    let chosenAnchor = candidateRooms[0] || existingRooms[0];
    let chosenDir: ExitDirection = 'E';

    for (const r of candidateRooms) {
      const usedDirs = new Set(r.exits.map((e) => e.direction));
      const free = cardinalDirs.find((d) => !usedDirs.has(d));
      if (free) {
        chosenAnchor = r;
        chosenDir = free;
        break;
      }
    }

    const oppositeDirMap: Record<ExitDirection, ExitDirection> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
      U: 'D',
      D: 'U',
    };

    const deltaOffsets: Record<ExitDirection, { dx: number; dy: number }> = {
      N: { dx: 0, dy: -90 },
      S: { dx: 0, dy: 90 },
      E: { dx: 110, dy: 0 },
      W: { dx: -110, dy: 0 },
      U: { dx: 0, dy: -60 },
      D: { dx: 0, dy: 60 },
    };

    const offset = deltaOffsets[chosenDir] || { dx: 100, dy: 50 };
    const desiredRooms = prng() > 0.4 ? 3 : 2;
    const roomCount = Math.min(desiredRooms, availableSlots);
    const newRooms: RoomNode[] = [];

    const hybridElements: ElementalAffinity[] = [
      ATMOSPHERE_META[localAddress.atmosphere]?.element || 'Physical',
      ATMOSPHERE_META[remoteAddress.atmosphere]?.element || 'Void',
    ];
    const blendedElement = hybridElements[Math.floor(prng() * hybridElements.length)];

    const eraMeta = SERVER_ERAS[localAddress.era] || SERVER_ERAS['Θ'];

    // 40% Host A: Local anchor room traits
    const hostAAtmosphere = chosenAnchor.atmospherePrefix || localAddress.atmosphere;
    const hostAArchitecture = chosenAnchor.structuralTheme || localAddress.theme;
    // 40% Host B: Remote TraitProfile / remoteAddress traits
    const hostBBiome = remoteProfile?.primaryBiome || remoteAddress.biome;
    const hostBArchitecture = remoteProfile?.primaryArchitecture || remoteAddress.theme;
    const hostBAtmosphere = remoteProfile?.primaryAtmosphere || remoteAddress.atmosphere;

    for (let i = 0; i < roomCount; i++) {
      const roomId = `${incursionId}-${i + 1}`;
      const isSanctum = i === roomCount - 1;

      // 3-way genetic blend for this room
      const rollBlend = prng();
      let roomAtmo: AtmospherePrefix;
      let roomTheme: StructuralTheme;
      let title: string;

      if (rollBlend < 0.4) {
        roomAtmo = hostAAtmosphere;
        roomTheme = hostAArchitecture;
        title = `${roomAtmo} ${hostBBiome} Chamber`;
      } else if (rollBlend < 0.8) {
        roomAtmo = hostBAtmosphere;
        roomTheme = hostBArchitecture;
        title = `${remoteOwner}'s ${roomTheme} ${hostBBiome}`;
      } else {
        roomAtmo = localAddress.atmosphere;
        roomTheme = remoteAddress.theme;
        title = `${anomaly.prefix} ${hostBBiome} Rift-Hollow`;
      }

      // Position along anchor vector
      const posX = Math.max(50, Math.min(950, chosenAnchor.x + offset.dx * (i + 1)));
      const posY = Math.max(50, Math.min(550, chosenAnchor.y + offset.dy * (i + 1)));

      const roomExits: RoomNode['exits'] = [];
      const synthesisAtmosphere = `${localAddress.atmosphere}-${remoteAddress.atmosphere} Conjunction`;
      if (i === 0) {
        // Exits back to anchor room via Synthesis Seam
        roomExits.push({
          direction: oppositeDirMap[chosenDir],
          targetRoomId: chosenAnchor.id,
          isSynthesisSeam: true,
          synthesisAtmosphere,
        });
      } else {
        // Exits back to previous incursion room
        roomExits.push({
          direction: oppositeDirMap[chosenDir],
          targetRoomId: `${incursionId}-${i}`,
        });
      }

      if (i < roomCount - 1) {
        // Exits forward to next incursion room
        roomExits.push({
          direction: chosenDir,
          targetRoomId: `${incursionId}-${i + 2}`,
        });
      }

      // Generate incursion monster or guardian
      const monsters: MonsterEntity[] = [];
      const mobElement = i % 2 === 0 ? blendedElement : 'Bio';
      const weakness = mobElement === 'Fire' ? 'Frost' : mobElement === 'Frost' ? 'Fire' : 'Void';

      if (isSanctum) {
        // Conjunction Guardian
        const guardianHp = Math.round(180 * eraMeta.statMultiplier);
        monsters.push({
          id: `mob-${roomId}-guardian`,
          templateId: 'overgrowth-guardian',
          name: `${anomaly.prefix} ${remoteAddress.theme} Guardian`,
          level: eraMeta.levelTier + 2,
          isBoss: true,
          hp: guardianHp,
          maxHp: guardianHp,
          atk: Math.round(18 * eraMeta.statMultiplier),
          mitigationPct: 18,
          speed: 12,
          atbGauge: 0,
          element: mobElement,
          weakness,
          statuses: [],
          adjectives: [anomaly.prefix],
          loreSnippet: `A Conjunction harmonic manifestation seeded by realm collision with ${remoteAddress.formatted}. Infused with ${anomaly.mobModifier}.`,
          secretWeaknessHint: `Foreign roots unravel under ${weakness} elemental attacks. Watch for ${anomaly.hazard}!`,
          lootTable: [
            this.createDeterministicItem(`loot-${roomId}`, remoteAddress, eraMeta, prng, true),
          ],
        });
      } else {
        // Incursion spore scout
        const mobHp = Math.round(90 * eraMeta.statMultiplier);
        monsters.push({
          id: `mob-${roomId}-creeper`,
          templateId: 'incursion-creeper',
          name: `${anomaly.prefix} Incursion Creeper`,
          level: eraMeta.levelTier,
          isBoss: false,
          hp: mobHp,
          maxHp: mobHp,
          atk: Math.round(12 * eraMeta.statMultiplier),
          mitigationPct: 10,
          speed: 10,
          atbGauge: 0,
          element: mobElement,
          weakness,
          statuses: [],
          adjectives: [anomaly.prefix],
          loreSnippet: `Invasive biological growth encroaching from ${remoteAddress.formatted} with ${anomaly.mobModifier}.`,
          secretWeaknessHint: `Vulnerable to ${weakness} damage.`,
          lootTable: [
            this.createDeterministicItem(`loot-${roomId}`, localAddress, eraMeta, prng, false),
          ],
        });
      }

      const shardsHarvestable = 15 + Math.floor(prng() * 16);

      newRooms.push({
        id: roomId,
        title,
        description: `A hybridized chamber where native architecture conjoined with ${remoteAddress.formatted} (Seeded by ${remoteOwner}). Pulsing violet mycelial veins cover the masonry. Environmental Anomaly: ${anomaly.hazard}.`,
        x: posX,
        y: posY,
        depthTier: chosenAnchor.depthTier + i + 1,
        legendType: isSanctum ? 'elite-boss' : 'hazard-trap',
        customLegendId: undefined,
        atmosphereEffect: `${anomaly.prefix} Resonance: ${anomaly.hazard}`,
        elementalMutator: blendedElement,
        atmospherePrefix: roomAtmo,
        structuralTheme: roomTheme,
        biomeNoun: hostBBiome,
        exits: roomExits,
        monsters,
        items: isSanctum
          ? [
              this.createDeterministicItem(
                `item-${roomId}-relic`,
                remoteAddress,
                eraMeta,
                prng,
                false,
              ),
            ]
          : [],
        triggers: [],
        rumorSignal: `Conjunction Pulse: ${anomaly.prefix} ${remoteAddress.theme} incursion ahead`,
        isCustomDug: false,
        isOvergrowth: true,
        isConjunction: true,
        conjunctionAnomaly: anomaly,
        originTriChord: remoteAddress.formatted,
        originPlayerName: remoteOwner,
        isPrunable: false,
        shardsHarvestable,
        travelerEcho: isSanctum && remoteEcho ? remoteEcho : undefined,
        isSynthesisSeam: i === 0,
        synthesisAtmosphere: i === 0 ? synthesisAtmosphere : undefined,
      });
    }

    return {
      incursionId,
      newRooms,
      anchorRoomId: chosenAnchor.id,
      anchorExitDir: chosenDir,
      anomaly,
    };
  }

  generateOvergrowthIncursion(
    localAddress: ChaosGateAddress,
    remoteAddress: ChaosGateAddress,
    remoteOwner: string,
    existingRooms: RoomNode[],
    remoteEcho?: TravelerEcho,
  ): {
    incursionId: string;
    newRooms: RoomNode[];
    anchorRoomId: string;
    anchorExitDir: ExitDirection;
  } {
    const res = this.generateConjunctionIncursion(
      localAddress,
      remoteAddress,
      remoteOwner,
      existingRooms,
      0,
      remoteEcho,
    );
    return {
      incursionId: res.incursionId,
      newRooms: res.newRooms,
      anchorRoomId: res.anchorRoomId,
      anchorExitDir: res.anchorExitDir,
    };
  }

  /**
   * Generates a temporary self-contained 6-room delve for a Wayfinder 3-Word Expedition.
   * Defeating the Apex Boss in exp-5 guarantees a Sphere Core item drop.
   */
  generateExpeditionRooms(address: ChaosGateAddress): RoomNode[] {
    const eraMeta = SERVER_ERAS[address.era] || SERVER_ERAS['Θ'];
    const atmoMeta = ATMOSPHERE_META[address.atmosphere];
    const themeMeta = THEME_META[address.theme];
    const biomeMeta = BIOME_META[address.biome];
    const prng = createMulberry32(address.seed ^ 0x9e3779b9);

    const sphereCoreItem: EquipmentItem = {
      id: `item-sphere-core-${address.seed}`,
      name: `Sphere Core: ${address.formatted}`,
      slot: 'Relic 1',
      rarity: 'Mythic',
      weight: 2,
      provenance: 'Verified Drop',
      originGateAddress: address.formatted,
      statBonuses: {
        STR: 5,
        DEX: 5,
        INT: 5,
        atkBonus: 10,
        speedPctBonus: 8,
      },
      totalStatBudget: 33,
      isSphereCore: true,
      sphereCoreAddress: address,
      sphereCoreRarity: 'ANCIENT',
      description: `A crystalline sphere humming with ${address.formatted} resonance. Can be Cracked for 100 shards or Grafted at the Wayfinder Loom to expand your Home Dungeon.`,
    };

    const bossHp = Math.round(220 * eraMeta.statMultiplier);
    const bossMonster: MonsterEntity = {
      id: `mob-exp-5-boss`,
      templateId: 'expedition-apex-boss',
      name: `${address.atmosphere} ${address.theme} Sovereign`,
      level: eraMeta.levelTier + 3,
      isBoss: true,
      hp: bossHp,
      maxHp: bossHp,
      atk: Math.round(22 * eraMeta.statMultiplier),
      mitigationPct: 20,
      speed: 13,
      atbGauge: 0,
      element: atmoMeta.element,
      weakness: biomeMeta.bossWeakness,
      statuses: [],
      adjectives: [address.atmosphere, address.theme],
      loreSnippet: `The apex guardian of the unstable ${address.formatted} delve, condensing the planar essence into a pristine Sphere Core.`,
      secretWeaknessHint: `Sovereign armor cracks under ${biomeMeta.bossWeakness} strikes.`,
      lootTable: [sphereCoreItem],
    };

    const rooms: RoomNode[] = [
      {
        id: 'exp-0',
        title: `Rift Ingress: ${address.formatted}`,
        description: `A swirling violet fissure tethers this temporary expedition pocket to the Primordial Anchor. Beyond lies the untamed geometry of ${address.formatted}.`,
        x: 460,
        y: 160,
        depthTier: 1,
        legendType: 'anchor-portal',
        atmosphereEffect: `${atmoMeta.lighting} — Unstable Dimensional Rift`,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        isRiftPortal: true,
        exits: [
          { direction: 'D', targetRoomId: 'room-0', isRiftPortal: true },
          { direction: 'N', targetRoomId: 'exp-1' },
        ],
        monsters: [],
        items: [],
        triggers: [],
        rumorSignal: `Expedition Ingress: Delving into ${address.formatted}`,
      },
      {
        id: 'exp-1',
        title: `${address.atmosphere} Vestibule`,
        description: `The outer ring of ${address.theme} architecture. Foreign atmospheric pressure builds in your lungs.`,
        x: 460,
        y: 80,
        depthTier: 2,
        legendType: 'corridor',
        atmosphereEffect: atmoMeta.lighting,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        exits: [
          { direction: 'S', targetRoomId: 'exp-0' },
          { direction: 'E', targetRoomId: 'exp-2' },
        ],
        monsters: [
          this.createRegularMonster(
            'mob-exp-1',
            themeMeta.monsterFamily[0],
            eraMeta,
            atmoMeta.element,
            biomeMeta.bossWeakness,
            address.formatted,
            prng,
            address.atmosphere,
          ),
        ],
        items: [],
        triggers: [],
        rumorSignal: `Whispers of ${address.theme} guardians`,
      },
      {
        id: 'exp-2',
        title: `${address.theme} Trial Hall`,
        description: `Carved with ancient glyphs depicting the ${biomeMeta.interactableProp.name}. A puzzle mechanism ticks in the center.`,
        x: 580,
        y: 80,
        depthTier: 3,
        legendType: 'puzzle-mechanism',
        atmosphereEffect: atmoMeta.lighting,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        exits: [
          { direction: 'W', targetRoomId: 'exp-1' },
          { direction: 'N', targetRoomId: 'exp-3' },
        ],
        monsters: [],
        items: [this.createDeterministicItem('item-exp-2', address, eraMeta, prng, false)],
        triggers: [],
        rumorSignal: `Mechanism ticks within the Trial Hall`,
        propInteractable: { ...biomeMeta.interactableProp, solved: false },
      },
      {
        id: 'exp-3',
        title: `${address.atmosphere} Labyrinth Crossing`,
        description: `Narrow corridors cross in sharp angles. Hostile presences lurk in the shadows.`,
        x: 580,
        y: 0,
        depthTier: 4,
        legendType: 'hazard-trap',
        atmosphereEffect: atmoMeta.lighting,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        exits: [
          { direction: 'S', targetRoomId: 'exp-2' },
          { direction: 'W', targetRoomId: 'exp-4' },
        ],
        monsters: [
          this.createRegularMonster(
            'mob-exp-3',
            themeMeta.monsterFamily[1] || themeMeta.monsterFamily[0],
            eraMeta,
            atmoMeta.element,
            biomeMeta.bossWeakness,
            address.formatted,
            prng,
            address.atmosphere,
          ),
        ],
        items: [],
        triggers: [],
        rumorSignal: `Heavy footsteps reverberate ahead`,
      },
      {
        id: 'exp-4',
        title: `${address.theme} Ante-Chamber`,
        description: `The threshold of the inner sanctum. The air vibrates with the raw planar force of ${address.formatted}.`,
        x: 460,
        y: 0,
        depthTier: 5,
        legendType: 'treasure-vault',
        atmosphereEffect: atmoMeta.lighting,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        exits: [
          { direction: 'E', targetRoomId: 'exp-3' },
          { direction: 'N', targetRoomId: 'exp-5' },
        ],
        monsters: [],
        items: [this.createDeterministicItem('item-exp-4', address, eraMeta, prng, false)],
        triggers: [],
        rumorSignal: `A massive presence stirs in the Apex Sanctum`,
      },
      {
        id: 'exp-5',
        title: `${address.theme} Apex Sanctum`,
        description: `The pinnacle of this unstable delve. A sovereign being holds the crystallized Sphere Core in stasis. Defeat it to claim the core!`,
        x: 460,
        y: -80,
        depthTier: 6,
        legendType: 'elite-boss',
        atmosphereEffect: `${atmoMeta.lighting} — Planar Singularity`,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: address.atmosphere,
        structuralTheme: address.theme,
        biomeNoun: address.biome,
        isExpedition: true,
        exits: [{ direction: 'S', targetRoomId: 'exp-4' }],
        monsters: [bossMonster],
        items: [],
        triggers: [],
        rumorSignal: `The Sovereign awaits your challenge`,
      },
    ];

    return rooms;
  }

  /**
   * Permanently grafts 1-2 rooms from a harvested Sphere Core onto the Home Dungeon.
   * Respects 30-room maximum capacity.
   */
  graftSphereCoreRooms(
    existingRooms: RoomNode[],
    coreAddress: ChaosGateAddress,
    coreName: string,
  ): RoomNode[] {
    const MAX_REALM_ROOMS = 30;
    const available = Math.max(0, MAX_REALM_ROOMS - existingRooms.length);
    if (available <= 0) {
      return [];
    }

    const homeRooms = existingRooms.filter((r) => !r.isExpedition);
    const candidateRooms = [...homeRooms].reverse();
    const cardinalDirs: ExitDirection[] = ['E', 'S', 'W', 'N'];
    let chosenAnchor = candidateRooms[0] || homeRooms[0];
    let chosenDir: ExitDirection = 'E';

    for (const r of candidateRooms) {
      const usedDirs = new Set(r.exits.map((e) => e.direction));
      const free = cardinalDirs.find((d) => !usedDirs.has(d));
      if (free) {
        chosenAnchor = r;
        chosenDir = free;
        break;
      }
    }

    const oppositeDirMap: Record<ExitDirection, ExitDirection> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
      U: 'D',
      D: 'U',
    };

    const deltaOffsets: Record<ExitDirection, { dx: number; dy: number }> = {
      N: { dx: 0, dy: -90 },
      S: { dx: 0, dy: 90 },
      E: { dx: 110, dy: 0 },
      W: { dx: -110, dy: 0 },
      U: { dx: 0, dy: -60 },
      D: { dx: 0, dy: 60 },
    };

    const offset = deltaOffsets[chosenDir] || { dx: 100, dy: 50 };
    const roomsToCreate = Math.min(available, 2);
    const splicedSeed = (coreAddress.seed ^ homeRooms.length ^ 0x3c6ef35f) >>> 0;
    const prng = createMulberry32(splicedSeed);
    const graftId = `core-${splicedSeed.toString(36)}`;
    const eraMeta = SERVER_ERAS[coreAddress.era] || SERVER_ERAS['Θ'];
    const atmoMeta = ATMOSPHERE_META[coreAddress.atmosphere];

    const newRooms: RoomNode[] = [];
    for (let i = 0; i < roomsToCreate; i++) {
      const roomId = `${graftId}-${i + 1}`;
      const title =
        i === 0 ? `Grafted ${coreAddress.theme} Alcove` : `Crystallized ${coreAddress.biome} Vault`;
      const posX = Math.max(50, Math.min(950, chosenAnchor.x + offset.dx * (i + 1)));
      const posY = Math.max(50, Math.min(550, chosenAnchor.y + offset.dy * (i + 1)));

      const roomExits: RoomNode['exits'] = [];
      if (i === 0) {
        roomExits.push({
          direction: oppositeDirMap[chosenDir],
          targetRoomId: chosenAnchor.id,
          isSynthesisSeam: true,
          synthesisAtmosphere: `${coreAddress.atmosphere} Core Graft`,
        });
      } else {
        roomExits.push({
          direction: oppositeDirMap[chosenDir],
          targetRoomId: `${graftId}-${i}`,
        });
      }

      if (i < roomsToCreate - 1) {
        roomExits.push({
          direction: chosenDir,
          targetRoomId: `${graftId}-${i + 2}`,
        });
      }

      newRooms.push({
        id: roomId,
        title,
        description: `A permanent stratum grafted from ${coreName}. The masonry pulses with crystallized ${coreAddress.formatted} energy.`,
        x: posX,
        y: posY,
        depthTier: chosenAnchor.depthTier + i + 1,
        legendType: i === roomsToCreate - 1 ? 'treasure-vault' : 'corridor',
        atmosphereEffect: `${atmoMeta.lighting} — Grafted Sphere Core`,
        elementalMutator: atmoMeta.element,
        atmospherePrefix: coreAddress.atmosphere,
        structuralTheme: coreAddress.theme,
        biomeNoun: coreAddress.biome,
        exits: roomExits,
        monsters: [],
        items: [this.createDeterministicItem(`item-${roomId}`, coreAddress, eraMeta, prng, false)],
        triggers: [],
        rumorSignal: `Grafted resonance from ${coreAddress.theme}`,
        isCustomDug: false,
        isOvergrowth: true,
        isConjunction: true,
        originTriChord: coreAddress.formatted,
        originPlayerName: 'Wayfinder Sphere Core',
        isPrunable: true,
        shardsHarvestable: 25,
      });
    }

    return newRooms;
  }

  private applyDeltaLayer(
    baseRooms: RoomNode[],
    delta: RealmDelta,
    address: ChaosGateAddress,
  ): RoomNode[] {
    const roomMap = new Map<string, RoomNode>();
    for (const r of baseRooms) {
      roomMap.set(r.id, { ...r, exits: [...r.exits], triggers: [...r.triggers] });
    }

    for (const [roomId, override] of Object.entries(delta.roomOverrides)) {
      const existing = roomMap.get(roomId);
      if (existing) {
        roomMap.set(roomId, {
          ...existing,
          title: override.title ?? existing.title,
          description: override.description ?? existing.description,
          legendType: override.legendType ?? existing.legendType,
          customLegendId: override.customLegendId ?? existing.customLegendId,
          exits: override.exits ?? existing.exits,
          triggers: override.triggers ?? existing.triggers,
          monsters: override.customMonsters ?? existing.monsters,
          items: override.customItems ?? existing.items,
          x: override.x ?? existing.x,
          y: override.y ?? existing.y,
          isOvergrowth: override.isOvergrowth ?? existing.isOvergrowth,
          isConjunction: override.isConjunction ?? existing.isConjunction,
          conjunctionAnomaly: override.conjunctionAnomaly ?? existing.conjunctionAnomaly,
          atmospherePrefix: override.atmospherePrefix ?? existing.atmospherePrefix,
          structuralTheme: override.structuralTheme ?? existing.structuralTheme,
          biomeNoun: override.biomeNoun ?? existing.biomeNoun,
          originTriChord: override.originTriChord ?? existing.originTriChord,
          originPlayerName: override.originPlayerName ?? existing.originPlayerName,
          isPrunable: override.isPrunable ?? existing.isPrunable,
          shardsHarvestable: override.shardsHarvestable ?? existing.shardsHarvestable,
          travelerEcho: override.travelerEcho ?? existing.travelerEcho,
          inscriptions: override.inscriptions ?? existing.inscriptions,
        });
      } else {
        // Custom dug room or overgrowth room added by Incursion/Architect
        roomMap.set(roomId, {
          id: roomId,
          title: override.title ?? 'Architect Excavated Chamber',
          description:
            override.description ??
            `A custom chamber excavated within ${address.formatted} by the Realm Architect.`,
          x: override.x ?? 520,
          y: override.y ?? 320,
          depthTier: baseRooms.length,
          legendType: override.legendType ?? (override.isOvergrowth ? 'hazard-trap' : 'custom'),
          customLegendId: override.customLegendId,
          atmosphereEffect: override.isOvergrowth
            ? `Incursion Veins: ${override.originTriChord ?? 'Foreign resonance'}`
            : 'Architect-tuned chamber resonance',
          elementalMutator: 'Physical',
          atmospherePrefix: override.atmospherePrefix,
          structuralTheme: override.structuralTheme,
          biomeNoun: override.biomeNoun,
          exits: override.exits ?? [],
          monsters: override.customMonsters ?? [],
          items: override.customItems ?? [],
          triggers: override.triggers ?? [],
          rumorSignal: `Signal: ${override.title ?? 'Custom Chamber'}`,
          isCustomDug: override.isCustomDug ?? !override.isOvergrowth,
          isOvergrowth: override.isOvergrowth,
          isConjunction: override.isConjunction,
          conjunctionAnomaly: override.conjunctionAnomaly,
          originTriChord: override.originTriChord,
          originPlayerName: override.originPlayerName,
          isPrunable: override.isPrunable,
          shardsHarvestable: override.shardsHarvestable,
          travelerEcho: override.travelerEcho,
          inscriptions: override.inscriptions ?? [],
        });
      }
    }

    return Array.from(roomMap.values());
  }

  /**
   * Deterministically grows the base dungeon up to stage 1..10 (expanding up to 30+ rooms)
   */
  growRealmToStage(address: ChaosGateAddress, growthStage = 1, delta?: RealmDelta): RoomNode[] {
    const clampedStage = Math.max(1, Math.min(10, Math.floor(growthStage || 1)));
    const baseRooms = this.generateRealm(address);
    if (clampedStage === 1 && !delta) {
      return baseRooms;
    }

    const rooms: RoomNode[] = baseRooms.map((r) => ({
      ...r,
      exits: r.exits.map((e) => ({ ...e })),
      monsters: r.monsters.map((m) => ({ ...m })),
      items: r.items.map((it) => ({ ...it })),
      triggers: [...r.triggers],
    }));

    const eraMeta = SERVER_ERAS[address.era];
    const atmoMeta = ATMOSPHERE_META[address.atmosphere];
    const themeMeta = THEME_META[address.theme];
    const biomeMeta = BIOME_META[address.biome];

    // Sprout new wings for stages 2 through clampedStage
    for (let s = 2; s <= clampedStage; s++) {
      const stagePrng = createMulberry32(address.seed + s * 1009);
      const candidateRooms = rooms.filter((r) => !r.isOvergrowth);
      const anchorIdx = Math.floor(stagePrng() * candidateRooms.length);
      const anchor = candidateRooms[anchorIdx] || rooms[0];

      const roomsInWing = stagePrng() > 0.4 ? 3 : 2;
      const cardinalDirs: ExitDirection[] = ['E', 'S', 'W', 'N', 'D', 'U'];
      const usedDirs = new Set(anchor.exits.map((e) => e.direction));
      const chosenDir =
        cardinalDirs.find((d) => !usedDirs.has(d)) || (stagePrng() > 0.5 ? 'E' : 'S');

      const oppositeDirMap: Record<ExitDirection, ExitDirection> = {
        N: 'S',
        S: 'N',
        E: 'W',
        W: 'E',
        U: 'D',
        D: 'U',
      };
      const deltaOffsets: Record<ExitDirection, { dx: number; dy: number }> = {
        N: { dx: 0, dy: -85 },
        S: { dx: 0, dy: 85 },
        E: { dx: 110, dy: 0 },
        W: { dx: -110, dy: 0 },
        U: { dx: 30, dy: -60 },
        D: { dx: -30, dy: 60 },
      };
      const offset = deltaOffsets[chosenDir] || { dx: 90, dy: 45 };

      const wingRooms: RoomNode[] = [];
      for (let rIdx = 0; rIdx < roomsInWing; rIdx++) {
        const roomId = `room-s${s}-${rIdx + 1}`;
        const noun = biomeMeta.roomNouns[(s + rIdx) % biomeMeta.roomNouns.length];
        const title = `Stage ${s} ${address.theme} ${noun}`;
        const posX = Math.max(50, Math.min(910, anchor.x + offset.dx * (rIdx + 1)));
        const posY = Math.max(50, Math.min(530, anchor.y + offset.dy * (rIdx + 1)));

        const roomExits: RoomExit[] = [];
        if (rIdx === 0) {
          roomExits.push({
            direction: oppositeDirMap[chosenDir],
            targetRoomId: anchor.id,
          });
          anchor.exits.push({
            direction: chosenDir,
            targetRoomId: roomId,
          });
        } else {
          roomExits.push({
            direction: oppositeDirMap[chosenDir],
            targetRoomId: `room-s${s}-${rIdx}`,
          });
        }

        if (rIdx < roomsInWing - 1) {
          roomExits.push({
            direction: chosenDir,
            targetRoomId: `room-s${s}-${rIdx + 2}`,
          });
        }

        const monsters: MonsterEntity[] = [];
        if (stagePrng() < 0.6) {
          const family = themeMeta.monsterFamily;
          const mName = family[Math.floor(stagePrng() * family.length)];
          monsters.push(
            this.createRegularMonster(
              `mob-s${s}-${rIdx}`,
              mName,
              eraMeta,
              atmoMeta.element,
              biomeMeta.bossWeakness,
              address.formatted,
              stagePrng,
              address.atmosphere,
            ),
          );
        }

        const items: EquipmentItem[] = [];
        if (rIdx === roomsInWing - 1 || stagePrng() < 0.5) {
          items.push(
            this.createDeterministicItem(`item-s${s}-${rIdx}`, address, eraMeta, stagePrng, false),
          );
        }

        wingRooms.push({
          id: roomId,
          title,
          description: `A newly crystallized stratum of ${address.formatted} awakened at Growth Stage ${s}. Masonry pulses with vital resonance.`,
          x: posX,
          y: posY,
          depthTier: anchor.depthTier + s,
          legendType: rIdx === roomsInWing - 1 ? 'treasure-vault' : 'corridor',
          atmosphereEffect: `${atmoMeta.lighting} — Stage ${s} Vital Resonance`,
          elementalMutator: atmoMeta.element,
          exits: roomExits,
          monsters,
          items,
          triggers: [],
          rumorSignal: `Signal: Stage ${s} ${address.theme} expansion`,
          growthStage: s,
          propInteractable:
            rIdx === 0 ? { ...biomeMeta.interactableProp, solved: false } : undefined,
        });
      }
      rooms.push(...wingRooms);
    }

    if (delta) {
      return this.applyDeltaLayer(rooms, delta, address);
    }

    return rooms;
  }

  /**
   * Encodes a compact Realm DNA packet into a URL-safe Base64url cartridge string (<= 1KB)
   */
  serializeRealmDna(packet: RealmDnaPacket): string {
    const json = JSON.stringify(packet);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Decodes a compact Base64url Realm DNA packet string into a structured RealmDnaPacket
   */
  deserializeRealmDna(sporeString: string): RealmDnaPacket | null {
    try {
      let base64 = sporeString.trim().replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(json) as RealmDnaPacket;
      if (!parsed || !parsed.triChord || typeof parsed.growthStage !== 'number') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

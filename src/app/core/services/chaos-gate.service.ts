import { Injectable } from '@angular/core';
import {
  AtmospherePrefix,
  BiomeNoun,
  ChaosGateAddress,
  CoreLegendType,
  DeclarativeTrigger,
  ElementalAffinity,
  EquipmentItem,
  ExitDirection,
  MonsterEntity,
  RealmDelta,
  RoomNode,
  ServerEraLetter,
  ServerEraMetadata,
  StructuralTheme,
  TopologyPattern,
} from '../models/domain.models';

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
    topology: 'hub-and-spoke',
    monsterFamily: ['Chrono-Automaton', 'Brass Scuttler', 'Gear-Hound', 'Pendulum Sentinel'],
    trapFrequency: 0.45,
    puzzleFlavor: 'Synchronizedescapement gears and pressure valves',
  },
  Fungal: {
    topology: 'labyrinth',
    monsterFamily: ['Mycelial Hulk', 'Spore Weaver', 'Cordyceps Stalker', 'Lichen Shambler'],
    trapFrequency: 0.35,
    puzzleFlavor: 'Symbiotic root barriers sensitive to elemental heat',
  },
  Monolithic: {
    topology: 'ring',
    monsterFamily: ['Basalt Colossus', 'Runic Golem', 'Obelisk Warden', 'Shard Gargoyle'],
    trapFrequency: 0.25,
    puzzleFlavor: 'Engraved pressure monoliths requiring perceptual alignment',
  },
  Labyrinthine: {
    topology: 'labyrinth',
    monsterFamily: ['Minotaur Revenant', 'Corridor Phantom', 'Mirror Stalker', 'Trap-Spider'],
    trapFrequency: 0.55,
    puzzleFlavor: 'Shifting counterweight walls and illusionary alcoves',
  },
  Sunken: {
    topology: 'ring',
    monsterFamily: ['Trench Leviathan-Spawn', 'Brine Siren', 'Barnacle Knight', 'Abyssal Eel'],
    trapFrequency: 0.3,
    puzzleFlavor: 'Floodgate sluices and hydrostatic lock chambers',
  },
  Astral: {
    topology: 'tower',
    monsterFamily: ['Void Weaver', 'Nebula Seraph', 'Starlight Wraith', 'Comet Construct'],
    trapFrequency: 0.2,
    puzzleFlavor: 'Constellation lens arrays and phase-shift bridges',
  },
  Ossuary: {
    topology: 'labyrinth',
    monsterFamily: ['Marrow Knight', 'Skull Chime Choir', 'Crypt Lich-Thrall', 'Bone Construct'],
    trapFrequency: 0.4,
    puzzleFlavor: 'Ancestral reliquary seals and soul-weight scales',
  },
  Forge: {
    topology: 'hub-and-spoke',
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
  },
  Sanctuary: {
    roomNouns: ['Cloister Garden', 'Choir Nave', 'Votive Font', 'Meditation Apse', 'High Altar'],
    resourceNode: 'Consecrated Incense Brazier',
    hazardName: 'Warding Judgment Sigil',
    bossArchetype: 'Fallen Hierophant',
    bossWeakness: 'Bio',
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
        exits: [],
        monsters,
        items,
        triggers,
        rumorSignal: this.buildRumorSignal(legendType, address, biomeMeta),
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
      opts?: { isSecret?: boolean; isLocked?: boolean },
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
        });
      }
      if (!b.exits.some((e) => e.targetRoomId === a.id)) {
        b.exits.push({
          direction: dirBA,
          targetRoomId: a.id,
        });
      }
    };

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
  ): MonsterEntity {
    const baseHp = Math.round((55 + Math.floor(prng() * 25)) * eraMeta.statMultiplier);
    const atk = Math.round((11 + Math.floor(prng() * 5)) * eraMeta.statMultiplier);
    return {
      id,
      templateId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: `${eraMeta.letter}-Rank ${name}`,
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
      loreSnippet: `A native ${name} adapted to ${gateAddress}.`,
      secretWeaknessHint: `Structural joints destabilize when struck by ${weakness} or Sunder combos.`,
      lootTable: [],
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
      loreSnippet: `Supreme guardian of ${address.formatted}, bound to the Chaos Gate core.`,
      secretWeaknessHint: `Core shielding collapses under ${biomeMeta.bossWeakness} elemental bursts while Sundered.`,
      lootTable: [bossDrop],
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
        });
      } else {
        // Custom dug room added by Architect
        roomMap.set(roomId, {
          id: roomId,
          title: override.title ?? 'Architect Excavated Chamber',
          description:
            override.description ??
            `A custom chamber excavated within ${address.formatted} by the Realm Architect.`,
          x: override.x ?? 520,
          y: override.y ?? 320,
          depthTier: baseRooms.length,
          legendType: override.legendType ?? 'custom',
          customLegendId: override.customLegendId,
          atmosphereEffect: 'Architect-tuned chamber resonance',
          elementalMutator: 'Physical',
          exits: override.exits ?? [],
          monsters: override.customMonsters ?? [],
          items: override.customItems ?? [],
          triggers: override.triggers ?? [],
          rumorSignal: `Architect Signal: ${override.title ?? 'Custom Chamber'}`,
          isCustomDug: true,
        });
      }
    }

    return Array.from(roomMap.values());
  }
}

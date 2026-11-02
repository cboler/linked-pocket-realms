import { ElementalAffinity, MonsterEntity, StatusTag } from '../../core/models/domain.models';

export type EnemyArchetype =
  // Clockwork
  | 'chrono-automaton'
  | 'brass-scuttler'
  | 'gear-hound'
  | 'pendulum-sentinel'
  // Fungal
  | 'mycelial-hulk'
  | 'spore-weaver'
  | 'cordyceps-stalker'
  | 'lichen-shambler'
  // Monolithic
  | 'basalt-colossus'
  | 'runic-golem'
  | 'obelisk-warden'
  | 'shard-gargoyle'
  // Labyrinthine
  | 'minotaur-revenant'
  | 'corridor-phantom'
  | 'mirror-stalker'
  | 'trap-spider'
  // Sunken
  | 'trench-leviathan'
  | 'brine-siren'
  | 'barnacle-knight'
  | 'abyssal-eel'
  // Astral
  | 'void-weaver'
  | 'nebula-seraph'
  | 'starlight-wraith'
  | 'comet-construct'
  // Ossuary
  | 'marrow-knight'
  | 'skull-chime-choir'
  | 'crypt-lich'
  | 'bone-construct'
  // Forge
  | 'slag-behemoth'
  | 'cinder-artificer'
  | 'anvil-drake'
  | 'molten-ingot-fiend'
  // Bosses & Specials
  | 'boss-arch-regent'
  | 'boss-astromancer'
  | 'boss-lord-commander'
  | 'boss-hierophant'
  | 'boss-curator'
  | 'boss-sovereign'
  | 'boss-greed-engine'
  | 'boss-forgemaster'
  | 'incursion-creeper'
  | 'overgrowth-guardian'
  | 'expedition-apex-boss'
  | 'colossus-generic';

export interface VisualPalette {
  primary: string;
  secondary: string;
  highlight: string;
  glow: string;
  dark: string;
  detailStroke: string;
  threatAura: string;
}

export interface TacticalAdjectiveBadge {
  label: string;
  bg: string;
  color: string;
  border: string;
}

export interface AdjectiveVisualProfile {
  archetype: EnemyArchetype;
  adjectives: string[];
  palette: VisualPalette;
  particles:
    | 'embers'
    | 'frost'
    | 'sparks'
    | 'void-smoke'
    | 'spores'
    | 'stardust'
    | 'gold-glint'
    | 'gears'
    | 'none';
  hasFrostSpikes: boolean;
  hasHeatCorona: boolean;
  hasLightningArcs: boolean;
  hasVoidTendrils: boolean;
  hasSporeNodes: boolean;
  hasCelestialHalo: boolean;
  hasGildedFiligree: boolean;
  hasSpinningGears: boolean;
  hasSunderFractures: boolean;
  hasSilenceSeal: boolean;
  hasPrismaticSurge: boolean;
  isBoss: boolean;
  level: number;
  badges: TacticalAdjectiveBadge[];
}

/**
 * Recognizes the enemy archetype from template ID or monster name.
 */
export function resolveEnemyArchetype(templateId?: string, name?: string): EnemyArchetype {
  const norm = `${templateId || ''} ${name || ''}`.toLowerCase();

  // Bosses & Specials
  if (norm.includes('arch-regent') || norm.includes('deep crypt')) return 'boss-arch-regent';
  if (norm.includes('astromancer') || norm.includes('panopticon')) return 'boss-astromancer';
  if (norm.includes('lord-commander') || norm.includes('grand lord')) return 'boss-lord-commander';
  if (norm.includes('hierophant')) return 'boss-hierophant';
  if (norm.includes('curator prime') || norm.includes('lost lore')) return 'boss-curator';
  if (norm.includes('fulminating') || norm.includes('sovereign of the')) return 'boss-sovereign';
  if (norm.includes('greed-engine') || norm.includes('underboss')) return 'boss-greed-engine';
  if (norm.includes('forgemaster') || norm.includes('crucible core')) return 'boss-forgemaster';
  if (norm.includes('overgrowth-guardian') || norm.includes('overgrowth guardian'))
    return 'overgrowth-guardian';
  if (norm.includes('incursion-creeper') || norm.includes('incursion creeper'))
    return 'incursion-creeper';
  if (norm.includes('expedition-apex') || norm.includes('expedition') || norm.includes('sovereign'))
    return 'expedition-apex-boss';

  // Clockwork
  if (norm.includes('scuttler')) return 'brass-scuttler';
  if (norm.includes('hound')) return 'gear-hound';
  if (norm.includes('pendulum') || norm.includes('sentinel')) return 'pendulum-sentinel';
  if (norm.includes('chrono') || norm.includes('automaton')) return 'chrono-automaton';

  // Fungal
  if (norm.includes('mycelial') || norm.includes('hulk')) return 'mycelial-hulk';
  if (norm.includes('spore weaver') || norm.includes('spore-weaver')) return 'spore-weaver';
  if (norm.includes('cordyceps')) return 'cordyceps-stalker';
  if (norm.includes('lichen') || norm.includes('shambler')) return 'lichen-shambler';

  // Monolithic
  if (norm.includes('basalt') || norm.includes('basalt-colossus')) return 'basalt-colossus';
  if (norm.includes('runic golem') || norm.includes('runic-golem')) return 'runic-golem';
  if (norm.includes('obelisk')) return 'obelisk-warden';
  if (norm.includes('gargoyle') || norm.includes('shard gargoyle')) return 'shard-gargoyle';

  // Labyrinthine
  if (norm.includes('minotaur')) return 'minotaur-revenant';
  if (norm.includes('corridor') || norm.includes('phantom')) return 'corridor-phantom';
  if (norm.includes('mirror') || norm.includes('mirror stalker')) return 'mirror-stalker';
  if (norm.includes('trap-spider') || norm.includes('spider')) return 'trap-spider';

  // Sunken
  if (norm.includes('leviathan')) return 'trench-leviathan';
  if (norm.includes('siren')) return 'brine-siren';
  if (norm.includes('barnacle')) return 'barnacle-knight';
  if (norm.includes('eel')) return 'abyssal-eel';

  // Astral
  if (norm.includes('void weaver') || norm.includes('void-weaver')) return 'void-weaver';
  if (norm.includes('seraph')) return 'nebula-seraph';
  if (norm.includes('starlight wraith') || norm.includes('starlight-wraith'))
    return 'starlight-wraith';
  if (norm.includes('comet')) return 'comet-construct';

  // Ossuary
  if (norm.includes('marrow')) return 'marrow-knight';
  if (norm.includes('choir') || norm.includes('skull')) return 'skull-chime-choir';
  if (norm.includes('lich')) return 'crypt-lich';
  if (norm.includes('bone construct') || norm.includes('bone-construct')) return 'bone-construct';

  // Forge
  if (norm.includes('slag') || norm.includes('slag behemoth')) return 'slag-behemoth';
  if (norm.includes('artificer') || norm.includes('cinder artificer')) return 'cinder-artificer';
  if (norm.includes('drake') || norm.includes('anvil drake')) return 'anvil-drake';
  if (norm.includes('ingot') || norm.includes('ingot-fiend')) return 'molten-ingot-fiend';

  return 'colossus-generic';
}

/**
 * Extracts and normalizes descriptive adjectives from monster data.
 */
export function extractMonsterAdjectives(monster: MonsterEntity, roomTheme?: string): string[] {
  const result = new Set<string>();

  // 1. Explicit monster.adjectives
  if (monster.adjectives && Array.isArray(monster.adjectives)) {
    for (const adj of monster.adjectives) {
      if (adj && typeof adj === 'string') result.add(adj);
    }
  }

  // 2. Scan monster name for known adjectives
  const knownAdjectives = [
    'Scorching',
    'Crystalline',
    'Tempestuous',
    'Abyssal',
    'Blighted',
    'Aetherial',
    'Gilded',
    'Silent',
    'Void-Warped',
    'Chrono-Fractured',
    'Cataclysmic',
    'Prismatic',
    'Sub-Zero',
    'Magnetic',
    'Temporal',
    'Eldritch',
    'Radiant',
    'Clockwork',
    'Astral',
    'Fungal',
    'Monolithic',
    'Sunken',
    'Ossuary',
    'Forge',
    'Ancient',
    'Storm-forged',
  ];

  for (const known of knownAdjectives) {
    if (monster.name && monster.name.includes(known)) {
      result.add(known);
    }
  }

  // 3. Fallback to room theme if no atmospheric adjective is detected
  if (result.size === 0 && roomTheme && roomTheme !== 'default') {
    const formattedTheme = roomTheme.charAt(0).toUpperCase() + roomTheme.slice(1);
    result.add(formattedTheme);
  }

  // 4. Combat status effects (Burn, Chill, Sunder, Overcharge, Silenced)
  if (monster.statuses) {
    for (const st of monster.statuses) {
      if (st.tag) result.add(st.tag);
    }
  }

  // 5. Boss tag
  if (monster.isBoss) {
    result.add('Boss');
  }

  return Array.from(result);
}

/**
 * Builds the visual color palette based on extracted adjectives and element.
 */
export function buildPaletteForAdjectives(
  adjectives: string[],
  element: ElementalAffinity,
  isBoss: boolean,
): VisualPalette {
  const adjsLower = adjectives.map((a) => a.toLowerCase());

  // Prismatic Surge
  if (adjsLower.includes('prismatic') || adjsLower.includes('prismatic-surge')) {
    return {
      primary: '#ec4899',
      secondary: '#a855f7',
      highlight: '#38bdf8',
      glow: 'rgba(236, 72, 153, 0.55)',
      dark: '#1e1b4b',
      detailStroke: '#f43f5e',
      threatAura: 'rgba(236, 72, 153, 0.35)',
    };
  }

  // Scorching / Fire / Burn
  if (
    adjsLower.includes('scorching') ||
    adjsLower.includes('burn') ||
    adjsLower.includes('cataclysmic') ||
    element === 'Fire'
  ) {
    return {
      primary: '#ef4444',
      secondary: '#f97316',
      highlight: '#fbbf24',
      glow: 'rgba(239, 68, 68, 0.55)',
      dark: '#450a0a',
      detailStroke: '#f97316',
      threatAura: 'rgba(244, 63, 94, 0.35)',
    };
  }

  // Crystalline / Sub-Zero / Frost / Chill
  if (
    adjsLower.includes('crystalline') ||
    adjsLower.includes('sub-zero') ||
    adjsLower.includes('chill') ||
    element === 'Frost'
  ) {
    return {
      primary: '#38bdf8',
      secondary: '#0284c7',
      highlight: '#f0f9ff',
      glow: 'rgba(56, 189, 248, 0.55)',
      dark: '#082f49',
      detailStroke: '#7dd3fc',
      threatAura: 'rgba(56, 189, 248, 0.35)',
    };
  }

  // Tempestuous / Magnetic / Lightning / Overcharge
  if (
    adjsLower.includes('tempestuous') ||
    adjsLower.includes('magnetic') ||
    adjsLower.includes('overcharge') ||
    element === 'Lightning'
  ) {
    return {
      primary: '#facc15',
      secondary: '#eab308',
      highlight: '#fef08a',
      glow: 'rgba(250, 204, 21, 0.6)',
      dark: '#312e81',
      detailStroke: '#38bdf8',
      threatAura: 'rgba(250, 204, 21, 0.35)',
    };
  }

  // Blighted / Fungal / Bio
  if (adjsLower.includes('blighted') || adjsLower.includes('fungal') || element === 'Bio') {
    return {
      primary: '#84cc16',
      secondary: '#10b981',
      highlight: '#bef264',
      glow: 'rgba(132, 204, 22, 0.55)',
      dark: '#14532d',
      detailStroke: '#10b981',
      threatAura: 'rgba(132, 204, 22, 0.35)',
    };
  }

  // Abyssal / Void-Warped / Silent / Void
  if (
    adjsLower.includes('abyssal') ||
    adjsLower.includes('void-warped') ||
    adjsLower.includes('silent') ||
    element === 'Void'
  ) {
    return {
      primary: '#818cf8',
      secondary: '#6366f1',
      highlight: '#c084fc',
      glow: 'rgba(99, 102, 241, 0.55)',
      dark: '#09090b',
      detailStroke: '#a855f7',
      threatAura: 'rgba(99, 102, 241, 0.35)',
    };
  }

  // Aetherial / Radiant / Astral
  if (
    adjsLower.includes('aetherial') ||
    adjsLower.includes('radiant') ||
    adjsLower.includes('astral')
  ) {
    return {
      primary: '#c084fc',
      secondary: '#a855f7',
      highlight: '#fdf4ff',
      glow: 'rgba(192, 132, 252, 0.55)',
      dark: '#2e1065',
      detailStroke: '#f472b6',
      threatAura: 'rgba(192, 132, 252, 0.35)',
    };
  }

  // Gilded / Gold
  if (adjsLower.includes('gilded')) {
    return {
      primary: '#eab308',
      secondary: '#f59e0b',
      highlight: '#fef08a',
      glow: 'rgba(234, 179, 8, 0.55)',
      dark: '#422006',
      detailStroke: '#fbbf24',
      threatAura: 'rgba(234, 179, 8, 0.35)',
    };
  }

  // Clockwork / Temporal / Chrono-Fractured
  if (
    adjsLower.includes('clockwork') ||
    adjsLower.includes('chrono-fractured') ||
    adjsLower.includes('temporal')
  ) {
    return {
      primary: '#f59e0b',
      secondary: '#d97706',
      highlight: '#fde68a',
      glow: 'rgba(245, 158, 11, 0.55)',
      dark: '#1c1917',
      detailStroke: '#b45309',
      threatAura: 'rgba(245, 158, 11, 0.35)',
    };
  }

  // Boss Fallback Palette
  if (isBoss) {
    return {
      primary: '#f43f5e',
      secondary: '#e11d48',
      highlight: '#ffe4e6',
      glow: 'rgba(244, 63, 94, 0.55)',
      dark: '#4c0519',
      detailStroke: '#fda4af',
      threatAura: 'rgba(244, 63, 94, 0.4)',
    };
  }

  // Default Standard Palette
  return {
    primary: '#94a3b8',
    secondary: '#64748b',
    highlight: '#e2e8f0',
    glow: 'rgba(148, 163, 184, 0.45)',
    dark: '#0f172a',
    detailStroke: '#cbd5e1',
    threatAura: 'rgba(148, 163, 184, 0.25)',
  };
}

/**
 * Creates tactical adjective badges for quick inspection.
 */
export function buildTacticalBadges(
  adjectives: string[],
  statuses: StatusTag[],
  isBoss: boolean,
): TacticalAdjectiveBadge[] {
  const badges: TacticalAdjectiveBadge[] = [];

  if (isBoss) {
    badges.push({
      label: 'BOSS',
      bg: '#881337',
      color: '#fda4af',
      border: '#f43f5e',
    });
  }

  for (const adj of adjectives) {
    if (adj === 'Boss') continue;
    const lower = adj.toLowerCase();
    let bg = '#1e293b';
    let color = '#94a3b8';
    let border = '#334155';

    if (lower === 'scorching' || lower === 'burn') {
      bg = '#450a0a';
      color = '#fca5a5';
      border = '#ef4444';
    } else if (lower === 'crystalline' || lower === 'sub-zero' || lower === 'chill') {
      bg = '#082f49';
      color = '#7dd3fc';
      border = '#38bdf8';
    } else if (lower === 'tempestuous' || lower === 'overcharge' || lower === 'magnetic') {
      bg = '#312e81';
      color = '#fef08a';
      border = '#facc15';
    } else if (lower === 'abyssal' || lower === 'void-warped' || lower === 'silent') {
      bg = '#18181b';
      color = '#c084fc';
      border = '#818cf8';
    } else if (lower === 'blighted' || lower === 'fungal') {
      bg = '#14532d';
      color = '#bef264';
      border = '#84cc16';
    } else if (lower === 'aetherial' || lower === 'radiant' || lower === 'astral') {
      bg = '#2e1065';
      color = '#f5d0fe';
      border = '#c084fc';
    } else if (lower === 'gilded') {
      bg = '#422006';
      color = '#fef08a';
      border = '#eab308';
    } else if (lower === 'clockwork' || lower === 'chrono-fractured' || lower === 'temporal') {
      bg = '#292524';
      color = '#fde68a';
      border = '#f59e0b';
    } else if (lower === 'sunder') {
      bg = '#7f1d1d';
      color = '#fca5a5';
      border = '#f87171';
    } else if (lower === 'silenced') {
      bg = '#262626';
      color = '#d4d4d4';
      border = '#737373';
    } else if (lower === 'cataclysmic') {
      bg = '#450a0a';
      color = '#fdba74';
      border = '#ea580c';
    } else if (lower === 'prismatic') {
      bg = '#3b0764';
      color = '#fbcfe8';
      border = '#ec4899';
    }

    badges.push({ label: adj, bg, color, border });
    if (badges.length >= 3) break; // Limit to top 3 badges to avoid SVG clutter
  }

  return badges;
}

/**
 * Resolves the full visual profile of any monster entity.
 */
export function resolveMonsterVisualProfile(
  monster: MonsterEntity,
  roomTheme?: string,
): AdjectiveVisualProfile {
  const archetype = resolveEnemyArchetype(monster.templateId, monster.name);
  const adjectives = extractMonsterAdjectives(monster, roomTheme);
  const palette = buildPaletteForAdjectives(adjectives, monster.element, monster.isBoss);

  const adjsLower = adjectives.map((a) => a.toLowerCase());

  // Determine particle systems
  let particles: AdjectiveVisualProfile['particles'] = 'none';
  if (
    adjsLower.includes('scorching') ||
    adjsLower.includes('burn') ||
    adjsLower.includes('cataclysmic') ||
    monster.element === 'Fire'
  ) {
    particles = 'embers';
  } else if (
    adjsLower.includes('crystalline') ||
    adjsLower.includes('sub-zero') ||
    adjsLower.includes('chill') ||
    monster.element === 'Frost'
  ) {
    particles = 'frost';
  } else if (
    adjsLower.includes('tempestuous') ||
    adjsLower.includes('overcharge') ||
    adjsLower.includes('magnetic') ||
    monster.element === 'Lightning'
  ) {
    particles = 'sparks';
  } else if (
    adjsLower.includes('blighted') ||
    adjsLower.includes('fungal') ||
    monster.element === 'Bio'
  ) {
    particles = 'spores';
  } else if (
    adjsLower.includes('abyssal') ||
    adjsLower.includes('void-warped') ||
    adjsLower.includes('silent') ||
    monster.element === 'Void'
  ) {
    particles = 'void-smoke';
  } else if (
    adjsLower.includes('aetherial') ||
    adjsLower.includes('astral') ||
    adjsLower.includes('radiant')
  ) {
    particles = 'stardust';
  } else if (adjsLower.includes('gilded')) {
    particles = 'gold-glint';
  } else if (
    adjsLower.includes('clockwork') ||
    adjsLower.includes('chrono-fractured') ||
    adjsLower.includes('temporal')
  ) {
    particles = 'gears';
  }

  // Visual mutation flags
  const hasFrostSpikes =
    adjsLower.includes('crystalline') ||
    adjsLower.includes('sub-zero') ||
    adjsLower.includes('chill') ||
    monster.element === 'Frost';

  const hasHeatCorona =
    adjsLower.includes('scorching') ||
    adjsLower.includes('burn') ||
    adjsLower.includes('cataclysmic') ||
    monster.element === 'Fire';

  const hasLightningArcs =
    adjsLower.includes('tempestuous') ||
    adjsLower.includes('overcharge') ||
    adjsLower.includes('magnetic') ||
    monster.element === 'Lightning';

  const hasVoidTendrils =
    adjsLower.includes('abyssal') ||
    adjsLower.includes('void-warped') ||
    adjsLower.includes('silent') ||
    monster.element === 'Void';

  const hasSporeNodes =
    adjsLower.includes('blighted') || adjsLower.includes('fungal') || monster.element === 'Bio';

  const hasCelestialHalo =
    adjsLower.includes('aetherial') ||
    adjsLower.includes('radiant') ||
    adjsLower.includes('astral') ||
    archetype === 'nebula-seraph' ||
    archetype === 'boss-hierophant';

  const hasGildedFiligree =
    adjsLower.includes('gilded') ||
    archetype === 'boss-greed-engine' ||
    archetype === 'boss-arch-regent';

  const hasSpinningGears =
    adjsLower.includes('clockwork') ||
    adjsLower.includes('chrono-fractured') ||
    adjsLower.includes('temporal') ||
    archetype === 'chrono-automaton' ||
    archetype === 'pendulum-sentinel' ||
    archetype === 'boss-greed-engine' ||
    archetype === 'boss-forgemaster';

  const hasSunderFractures = adjsLower.includes('sunder') || adjsLower.includes('cataclysmic');

  const hasSilenceSeal = adjsLower.includes('silenced');

  const hasPrismaticSurge =
    adjsLower.includes('prismatic') || adjsLower.includes('prismatic-surge');

  const statusTags = monster.statuses ? monster.statuses.map((s) => s.tag) : [];
  const badges = buildTacticalBadges(adjectives, statusTags, monster.isBoss);

  return {
    archetype,
    adjectives,
    palette,
    particles,
    hasFrostSpikes,
    hasHeatCorona,
    hasLightningArcs,
    hasVoidTendrils,
    hasSporeNodes,
    hasCelestialHalo,
    hasGildedFiligree,
    hasSpinningGears,
    hasSunderFractures,
    hasSilenceSeal,
    hasPrismaticSurge,
    isBoss: monster.isBoss,
    level: monster.level,
    badges,
  };
}

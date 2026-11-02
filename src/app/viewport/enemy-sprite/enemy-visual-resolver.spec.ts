import { describe, expect, it } from 'vitest';
import { MonsterEntity } from '../../core/models/domain.models';
import {
  extractMonsterAdjectives,
  resolveEnemyArchetype,
  resolveMonsterVisualProfile,
} from './enemy-visual-resolver';

describe('EnemyVisualResolver', () => {
  const createMockMob = (overrides: Partial<MonsterEntity> = {}): MonsterEntity => ({
    id: 'mob-1',
    templateId: 'chrono-automaton',
    name: 'Scorching Chrono-Automaton',
    level: 5,
    isBoss: false,
    hp: 100,
    maxHp: 100,
    atk: 15,
    mitigationPct: 10,
    speed: 10,
    atbGauge: 0,
    element: 'Fire',
    weakness: 'Frost',
    statuses: [],
    adjectives: ['Scorching'],
    loreSnippet: 'A burning automaton.',
    secretWeaknessHint: 'Vulnerable to frost.',
    lootTable: [],
    ...overrides,
  });

  describe('resolveEnemyArchetype', () => {
    it('should accurately map clockwork family species', () => {
      expect(resolveEnemyArchetype('chrono-automaton', 'Chrono-Automaton')).toBe(
        'chrono-automaton',
      );
      expect(resolveEnemyArchetype('brass-scuttler', 'Brass Scuttler')).toBe('brass-scuttler');
      expect(resolveEnemyArchetype('gear-hound', 'Gear-Hound')).toBe('gear-hound');
      expect(resolveEnemyArchetype('pendulum-sentinel', 'Pendulum Sentinel')).toBe(
        'pendulum-sentinel',
      );
    });

    it('should accurately map fungal family species', () => {
      expect(resolveEnemyArchetype('mycelial-hulk', 'Mycelial Hulk')).toBe('mycelial-hulk');
      expect(resolveEnemyArchetype('spore-weaver', 'Spore Weaver')).toBe('spore-weaver');
      expect(resolveEnemyArchetype('cordyceps-stalker', 'Cordyceps Stalker')).toBe(
        'cordyceps-stalker',
      );
      expect(resolveEnemyArchetype('lichen-shambler', 'Lichen Shambler')).toBe('lichen-shambler');
    });

    it('should accurately map monolithic, labyrinthine, sunken, astral, ossuary and forge species', () => {
      expect(resolveEnemyArchetype('basalt-colossus', 'Basalt Colossus')).toBe('basalt-colossus');
      expect(resolveEnemyArchetype('minotaur-revenant', 'Minotaur Revenant')).toBe(
        'minotaur-revenant',
      );
      expect(resolveEnemyArchetype('trench-leviathan-spawn', 'Trench Leviathan-Spawn')).toBe(
        'trench-leviathan',
      );
      expect(resolveEnemyArchetype('nebula-seraph', 'Nebula Seraph')).toBe('nebula-seraph');
      expect(resolveEnemyArchetype('marrow-knight', 'Marrow Knight')).toBe('marrow-knight');
      expect(resolveEnemyArchetype('anvil-drake', 'Anvil Drake')).toBe('anvil-drake');
    });

    it('should identify biome boss archetypes', () => {
      expect(resolveEnemyArchetype('', 'Arch-Regent of the Deep Crypt')).toBe('boss-arch-regent');
      expect(resolveEnemyArchetype('', 'Panopticon Astromancer')).toBe('boss-astromancer');
      expect(resolveEnemyArchetype('', 'Grand Lord-Commander')).toBe('boss-lord-commander');
      expect(resolveEnemyArchetype('', 'Fallen Hierophant')).toBe('boss-hierophant');
      expect(resolveEnemyArchetype('', 'Curator Prime of Lost Lore')).toBe('boss-curator');
      expect(resolveEnemyArchetype('', 'Sovereign of the Fulminating Peak')).toBe('boss-sovereign');
      expect(resolveEnemyArchetype('', 'Syndicate Underboss Greed-Engine')).toBe(
        'boss-greed-engine',
      );
      expect(resolveEnemyArchetype('', 'Prime Forgemaster Core')).toBe('boss-forgemaster');
    });

    it('should identify incursion and overgrowth guardians', () => {
      expect(resolveEnemyArchetype('overgrowth-guardian', 'Overgrowth Guardian')).toBe(
        'overgrowth-guardian',
      );
      expect(resolveEnemyArchetype('incursion-creeper', 'Incursion Creeper')).toBe(
        'incursion-creeper',
      );
      expect(resolveEnemyArchetype('expedition-apex-boss', 'Expedition Apex Sovereign')).toBe(
        'expedition-apex-boss',
      );
    });
  });

  describe('extractMonsterAdjectives', () => {
    it('should extract explicit adjectives and name adjectives', () => {
      const mob = createMockMob({
        name: 'Scorching Chrono-Automaton',
        adjectives: ['Scorching', 'Ancient'],
      });
      const adjs = extractMonsterAdjectives(mob);
      expect(adjs).toContain('Scorching');
      expect(adjs).toContain('Ancient');
    });

    it('should include combat status tags', () => {
      const mob = createMockMob({
        statuses: [
          { tag: 'Burn', remainingMs: 5000, stacks: 1, sourceId: 'p1' },
          { tag: 'Sunder', remainingMs: 3000, stacks: 1, sourceId: 'p1' },
        ],
      });
      const adjs = extractMonsterAdjectives(mob);
      expect(adjs).toContain('Burn');
      expect(adjs).toContain('Sunder');
    });

    it('should flag Boss entities', () => {
      const mob = createMockMob({ isBoss: true });
      const adjs = extractMonsterAdjectives(mob);
      expect(adjs).toContain('Boss');
    });
  });

  describe('resolveMonsterVisualProfile', () => {
    it('should build fiery particle and corona profile for Scorching enemies', () => {
      const mob = createMockMob({
        name: 'Scorching Brass Scuttler',
        adjectives: ['Scorching'],
        element: 'Fire',
      });
      const profile = resolveMonsterVisualProfile(mob);
      expect(profile.archetype).toBe('brass-scuttler');
      expect(profile.particles).toBe('embers');
      expect(profile.hasHeatCorona).toBe(true);
      expect(profile.palette.primary).toBe('#ef4444');
    });

    it('should build frosty crystal profile for Crystalline / Sub-Zero enemies', () => {
      const mob = createMockMob({
        templateId: 'mycelial-hulk',
        name: 'Crystalline Mycelial Hulk',
        adjectives: ['Crystalline'],
        element: 'Frost',
      });
      const profile = resolveMonsterVisualProfile(mob);
      expect(profile.archetype).toBe('mycelial-hulk');
      expect(profile.particles).toBe('frost');
      expect(profile.hasFrostSpikes).toBe(true);
      expect(profile.palette.primary).toBe('#38bdf8');
    });

    it('should build electric lightning profile for Tempestuous / Overcharge enemies', () => {
      const mob = createMockMob({
        templateId: 'gear-hound',
        name: 'Tempestuous Gear-Hound',
        adjectives: ['Tempestuous'],
        element: 'Lightning',
      });
      const profile = resolveMonsterVisualProfile(mob);
      expect(profile.archetype).toBe('gear-hound');
      expect(profile.particles).toBe('sparks');
      expect(profile.hasLightningArcs).toBe(true);
      expect(profile.palette.primary).toBe('#facc15');
    });

    it('should build void tendril profile for Abyssal / Void-Warped enemies', () => {
      const mob = createMockMob({
        templateId: 'minotaur-revenant',
        name: 'Void-Warped Minotaur Revenant',
        adjectives: ['Void-Warped'],
        element: 'Void',
      });
      const profile = resolveMonsterVisualProfile(mob);
      expect(profile.archetype).toBe('minotaur-revenant');
      expect(profile.particles).toBe('void-smoke');
      expect(profile.hasVoidTendrils).toBe(true);
    });

    it('should build tactical badges under health bar', () => {
      const mob = createMockMob({
        name: 'Scorching Chrono-Automaton',
        adjectives: ['Scorching'],
        isBoss: true,
      });
      const profile = resolveMonsterVisualProfile(mob);
      expect(profile.badges.length).toBeGreaterThan(0);
      expect(profile.badges[0].label).toBe('BOSS');
      expect(profile.badges.some((b) => b.label === 'Scorching')).toBe(true);
    });
  });
});

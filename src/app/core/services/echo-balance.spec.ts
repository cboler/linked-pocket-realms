import { TestBed } from '@angular/core/testing';
import { ArchetypeClass, EchoCompanion, RoomNode, ServerEraLetter } from '../models/domain.models';
import { createEcho, stepEcho } from './astral-echo';
import { ChaosGateService, SERVER_ERAS, createMulberry32 } from './chaos-gate.service';

/**
 * Balance harness: runs the Echo's real simulation in real generated dungeons and checks
 * the outcomes land in agreed ranges. If tuning changes, these tell you what moved.
 *
 * Targets (Echo at the era's level, at least 3; Farm job; one hour; rooms don't refill
 * within the hour, so a starting dungeon's 3–4 regular monsters are the most it can kill):
 * - It clears them within 30 minutes.
 * - Fights cost real HP (it drops below 70% at some point) and it goes down at most twice.
 * - Under-leveled (level 3 in a level-15 dungeon) it can't win by attrition: monsters heal
 *   when it backs off, so it either gets knocked down or makes at most one kill.
 * - Scout reveals every reachable room within 15 minutes.
 * - Live (2 s) and catch-up (30 s) steps agree within a factor of two.
 */

interface RunResult {
  /** Simulated ms until every regular monster was down (Infinity if never). */
  clearMs: number;
  /** Lowest HP reached, as a fraction of max. */
  minHpPct: number;
  kills: number;
  downed: number;
  regularMonsters: number;
  scouted: number;
  reachable: number;
}

function simulate(
  rooms: RoomNode[],
  echo: EchoCompanion,
  jobKind: 'FARM' | 'SCOUT',
  totalMs: number,
  stepMs: number,
  seed: number,
): RunResult {
  let world = rooms.map((r) => ({
    ...r,
    monsters: r.monsters.map((m) => ({ ...m })),
    items: [...r.items],
  }));
  const visited = new Set<string>(['room-0']);
  const job = echo.jobs.find((j) => j.kind === jobKind)!;
  let state: EchoCompanion = { ...echo, activeJobId: job.id, mode: 'WORKING' };
  const rng = createMulberry32(seed);
  let kills = 0;
  let downed = 0;
  let clearMs = Infinity;
  let minHpPct = 1;
  const regular = rooms.flatMap((r) => r.monsters).filter((m) => !m.isBoss).length;
  const start = 1_800_000_000_000;
  for (let t = stepMs; t <= totalMs; t += stepMs) {
    const result = stepEcho(
      state,
      {
        rooms: world,
        playerRoomId: null,
        playerTargetId: null,
        visitedRoomIds: [...visited],
        nowMs: start + t,
      },
      stepMs,
      rng,
    );
    state = result.echo;
    minHpPct = Math.min(minHpPct, state.hp / state.maxHp);
    kills += result.tally.kills;
    if (clearMs === Infinity && kills >= regular) clearMs = t;
    downed += result.tally.downedTimes;
    for (const eff of result.effects) {
      if (eff.kind === 'HEAL') {
        world = world.map((r) =>
          r.id !== eff.roomId
            ? r
            : {
                ...r,
                monsters: r.monsters.map((m) =>
                  m.id === eff.monsterId ? { ...m, hp: m.maxHp } : m,
                ),
              },
        );
      } else if (eff.kind === 'DAMAGE' || eff.kind === 'KILL') {
        world = world.map((r) =>
          r.id !== eff.roomId
            ? r
            : {
                ...r,
                monsters: r.monsters.map((m) =>
                  m.id !== eff.monsterId
                    ? m
                    : { ...m, hp: eff.kind === 'KILL' ? 0 : Math.max(0, m.hp - eff.damage) },
                ),
              },
        );
      } else if (eff.kind === 'TAKE') {
        world = world.map((r) =>
          r.id === eff.roomId
            ? { ...r, items: r.items.filter((i) => !eff.itemIds.includes(i.id)) }
            : r,
        );
      } else if (eff.kind === 'REVEAL') {
        visited.add(eff.roomId);
      }
    }
  }
  return {
    clearMs,
    minHpPct,
    kills,
    downed,
    regularMonsters: rooms.flatMap((r) => r.monsters).filter((m) => !m.isBoss).length,
    scouted: visited.size,
    reachable: rooms.filter((r) => !r.isExpedition).length,
  };
}

const ERAS: ServerEraLetter[] = ['Δ', 'Θ', 'Λ', 'Σ', 'Ω'];
const CLASSES: ArchetypeClass[] = ['Vanguard', 'Chronomancer', 'Hexblade', 'Artificer'];
const HOUR = 3_600_000;

describe('Astral Echo balance', () => {
  let gate: ChaosGateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    gate = TestBed.inject(ChaosGateService);
  });

  for (const era of ERAS) {
    it(`farms sensibly in era ${era}`, () => {
      const addr = gate.createAddress(era, 'Scorching', 'Clockwork', 'Catacombs');
      const rooms = gate.growRealmToStage(addr, 1);
      const level = Math.max(3, SERVER_ERAS[era].levelTier);
      const results = CLASSES.map((cls, i) => {
        const echo = { ...createEcho('Vanguard', level, 0), archetype: cls };
        return simulate(rooms, echo, 'FARM', HOUR, 30_000, 1000 + i);
      });
      for (const r of results) {
        // Clears a starting dungeon's regular monsters well within the hour...
        expect(r.clearMs).toBeLessThanOrEqual(30 * 60_000);
        expect(r.kills).toBe(r.regularMonsters);
        // ...but the fights cost real HP, and it rarely goes down.
        expect(r.minHpPct).toBeLessThan(0.7);
        expect(r.downed).toBeLessThanOrEqual(2);
      }
    });
  }

  it('is in real danger when under-leveled for the dungeon', () => {
    const addr = gate.createAddress('Σ', 'Scorching', 'Clockwork', 'Catacombs');
    const rooms = gate.growRealmToStage(addr, 1);
    const results = CLASSES.map((cls, i) =>
      simulate(
        rooms,
        { ...createEcho('Vanguard', 3, 0), archetype: cls },
        'FARM',
        HOUR,
        30_000,
        50 + i,
      ),
    );
    for (const r of results) expect(r.downed > 0 || r.kills <= 1).toBe(true);
  });

  it('scouts a whole stage-1 dungeon within 15 minutes', () => {
    const addr = gate.createAddress('Θ', 'Silent', 'Fungal', 'Observatory');
    const rooms = gate.growRealmToStage(addr, 1);
    const r = simulate(rooms, createEcho('Vanguard', 5, 0), 'SCOUT', 15 * 60_000, 2_000, 7);
    expect(r.scouted).toBe(r.reachable);
  });

  it('gives similar results live and in catch-up', () => {
    const addr = gate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs');
    const rooms = gate.growRealmToStage(addr, 1);
    const echo = createEcho('Vanguard', 5, 0);
    const live = simulate(rooms, echo, 'FARM', HOUR, 2_000, 11);
    const catchUp = simulate(rooms, echo, 'FARM', HOUR, 30_000, 11);
    expect(catchUp.kills).toBeGreaterThanOrEqual(Math.floor(live.kills / 2));
    expect(catchUp.kills).toBeLessThanOrEqual(live.kills * 2 + 1);
  });
});

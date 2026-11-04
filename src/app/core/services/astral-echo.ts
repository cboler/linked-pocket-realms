/**
 * Astral Echo companion: a pawn-like NPC that lives in your home realm.
 *
 * Everything here is pure and deterministic (given the rng), so the same code runs the live
 * loop (one step every 2 s) and the catch-up after time away (coarse 30 s steps).
 * The engine applies the returned world effects (monster HP, kills, floor items, chests)
 * through its normal paths, so kills are recorded, rooms refill, and a host broadcasts.
 */
import {
  ArchetypeClass,
  EchoCompanion,
  EchoJob,
  EchoJobKind,
  EquipmentItem,
  MonsterEntity,
  RoomNode,
} from '../models/domain.models';
import { CHEST_SEAL_RULES, lockpickChance } from './chaos-gate.service';

export const ECHO_TUNING = {
  LIVE_STEP_MS: 2_000,
  CATCHUP_STEP_MS: 30_000,
  CATCHUP_CAP_MS: 8 * 60 * 60_000,
  /** Time away shorter than this is folded in silently (no report). */
  REPORT_THRESHOLD_MS: 5 * 60_000,
  DOWNED_MS: 5 * 60_000,
  SATCHEL_CAP: 20,
  MAX_TAUGHT_JOBS: 8,
  MAX_ROUTE_ROOMS: 12,
  FARM_UNLOCK_LEVEL: 3,
  LOG_LIMIT: 50,
  RETREAT_HP: 0.35,
  RESUME_HP: 0.9,
  /** One action (a hop, a hit, a pickup) per this many ms of simulated time. */
  ACTION_MS: 2_000,
} as const;

export const ECHO_PEER_ID = 'astral-echo-local';

const CLASS_POWER: Record<ArchetypeClass, number> = {
  Vanguard: 1.0,
  Chronomancer: 1.15,
  Hexblade: 1.1,
  Artificer: 1.05,
};

export function echoMaxHp(level: number): number {
  return 50 + level * 16;
}

export function builtInJobs(): EchoJob[] {
  return [
    {
      id: 'job-follow',
      name: 'Follow',
      kind: 'FOLLOW',
      fight: true,
      loot: false,
      proficiency: 0,
      runs: 0,
    },
    {
      id: 'job-scout',
      name: 'Scout',
      kind: 'SCOUT',
      fight: false,
      loot: false,
      proficiency: 0,
      runs: 0,
    },
    {
      id: 'job-farm',
      name: 'Farm',
      kind: 'FARM',
      fight: true,
      loot: true,
      proficiency: 0,
      runs: 0,
    },
  ];
}

/** A new companion. Its class defaults to one that opens chests you can't. */
export function createEcho(
  playerArchetype: ArchetypeClass,
  playerLevel: number,
  nowMs: number,
): EchoCompanion {
  const archetype: ArchetypeClass =
    playerArchetype === 'Hexblade' || playerArchetype === 'Artificer' ? 'Vanguard' : 'Hexblade';
  const level = Math.max(1, playerLevel);
  return {
    name: 'Kite_Zero',
    archetype,
    level,
    xp: (level - 1) * 100,
    hp: echoMaxHp(level),
    maxHp: echoMaxHp(level),
    roomId: 'room-0',
    mode: 'IDLE',
    activeJobId: null,
    jobs: builtInJobs(),
    satchel: [],
    gold: 0,
    shards: 0,
    lockpicks: CHEST_SEAL_RULES.LOCK.classes.includes(archetype) ? 3 : 0,
    knowledge: {},
    lastSimulatedMs: nowMs,
    log: [{ atMs: nowMs, text: 'I am awake and waiting at the entrance.' }],
  };
}

export function jobUnlocked(echo: EchoCompanion, job: EchoJob): boolean {
  return job.kind !== 'FARM' || echo.level >= ECHO_TUNING.FARM_UNLOCK_LEVEL;
}

/** What the engine must do to the world after a step. */
export type EchoWorldEffect =
  | { kind: 'DAMAGE'; roomId: string; monsterId: string; damage: number }
  | { kind: 'KILL'; roomId: string; monsterId: string }
  | { kind: 'REVEAL'; roomId: string }
  | { kind: 'TAKE'; roomId: string; itemIds: string[] }
  | { kind: 'OPEN_CHEST'; roomId: string; chestId: string };

export interface EchoWorld {
  rooms: RoomNode[];
  /** Where the player is in this realm, or null when they're away or down. */
  playerRoomId: string | null;
  playerTargetId: string | null;
  visitedRoomIds: string[];
  nowMs: number;
}

export interface EchoStepTally {
  kills: number;
  roomsScouted: number;
  itemsFound: number;
  gold: number;
  levelsGained: number;
  downedTimes: number;
}

export interface EchoStepResult {
  echo: EchoCompanion;
  effects: EchoWorldEffect[];
  tally: EchoStepTally;
}

export function emptyTally(): EchoStepTally {
  return { kills: 0, roomsScouted: 0, itemsFound: 0, gold: 0, levelsGained: 0, downedTimes: 0 };
}

function addLog(echo: EchoCompanion, text: string, atMs: number): void {
  echo.log = [{ atMs, text }, ...echo.log].slice(0, ECHO_TUNING.LOG_LIMIT);
}

/** Next room on the shortest path from `from` to the nearest room matching `goal`. */
export function nextHop(
  rooms: RoomNode[],
  from: string,
  goal: (room: RoomNode) => boolean,
): { next: string; target: string } | null {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const start = byId.get(from);
  if (!start) return null;
  if (goal(start)) return { next: from, target: from };
  const prev = new Map<string, string>([[from, from]]);
  const queue = [from];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const room = byId.get(id);
    for (const exit of room?.exits ?? []) {
      const to = exit.targetRoomId;
      if (prev.has(to) || !byId.has(to)) continue;
      prev.set(to, id);
      const target = byId.get(to)!;
      if (goal(target)) {
        let step = to;
        while (prev.get(step) !== from) step = prev.get(step)!;
        return { next: step, target: to };
      }
      queue.push(to);
    }
  }
  return null;
}

/** A chest this companion can open right now (right class, and a pick if it needs one). */
function canOpen(
  echo: EchoCompanion,
  c: { opened: boolean; seal: keyof typeof CHEST_SEAL_RULES },
): boolean {
  const rule = CHEST_SEAL_RULES[c.seal];
  return (
    !c.opened &&
    rule.classes.includes(echo.archetype) &&
    (!rule.needsLockpick || echo.lockpicks > 0)
  );
}

function canFight(echo: EchoCompanion, m: MonsterEntity): boolean {
  return m.hp > 0 && (!m.isBoss || echo.level >= m.level);
}

function echoDamage(
  echo: EchoCompanion,
  job: EchoJob | null,
  m: MonsterEntity,
  rng: () => number,
): number {
  if (rng() < 0.1) return 0; // miss
  const knowledge = Math.min(0.2, (echo.knowledge[m.templateId] ?? 0) / 50);
  const prof = (job?.proficiency ?? 0) / 200;
  const variance = 0.85 + rng() * 0.3;
  const raw =
    (6 + echo.level * 4) * CLASS_POWER[echo.archetype] * (1 + knowledge + prof) * variance;
  return Math.max(1, Math.round(raw * (1 - m.mitigationPct / 100)));
}

function monsterDamageToEcho(job: EchoJob | null, m: MonsterEntity, rng: () => number): number {
  const prof = (job?.proficiency ?? 0) / 400;
  const variance = 0.85 + rng() * 0.3;
  return Math.max(1, Math.round(m.atk * (0.9 - prof) * variance));
}

function gainXp(echo: EchoCompanion, amount: number, tally: EchoStepTally, atMs: number): void {
  echo.xp += amount;
  const level = 1 + Math.floor(echo.xp / 100);
  if (level > echo.level) {
    tally.levelsGained += level - echo.level;
    echo.level = level;
    const maxHp = echoMaxHp(level);
    echo.hp = Math.min(maxHp, echo.hp + (maxHp - echo.maxHp));
    echo.maxHp = maxHp;
    addLog(echo, `I reached level ${level}.`, atMs);
    if (level === ECHO_TUNING.FARM_UNLOCK_LEVEL) addLog(echo, 'I can farm now.', atMs);
  }
}

function bumpProficiency(job: EchoJob | null): void {
  if (job) job.proficiency = Math.min(100, job.proficiency + 1);
}

/**
 * Advance the companion by `dtMs` of simulated time. Pure: returns a new companion and the
 * world effects; never mutates its inputs.
 */
export function stepEcho(
  input: EchoCompanion,
  world: EchoWorld,
  dtMs: number,
  rng: () => number,
): EchoStepResult {
  const echo: EchoCompanion = structuredClone(input);
  echo.lastSimulatedMs = world.nowMs;
  const effects: EchoWorldEffect[] = [];
  const tally = emptyTally();
  const now = world.nowMs;

  // Local view of the world that this step changes as it goes.
  const rooms: RoomNode[] = world.rooms.map((r) => ({
    ...r,
    monsters: r.monsters.map((m) => ({ ...m })),
    items: [...r.items],
    chests: r.chests?.map((c) => ({ ...c })),
  }));
  const roomById = (id: string): RoomNode | undefined => rooms.find((r) => r.id === id);
  const visited = new Set(world.visitedRoomIds);
  const campfire = (r: RoomNode): boolean => r.legendType === 'safe-campfire';

  if (echo.mode === 'DOWNED') {
    if (echo.carried) return { echo, effects, tally };
    if (now >= (echo.downedUntilMs ?? 0)) {
      echo.mode = 'IDLE';
      echo.hp = Math.round(echo.maxHp * 0.5);
      echo.roomId = 'room-0';
      echo.downedUntilMs = undefined;
      addLog(echo, 'I got back up at the entrance.', now);
    }
    return { echo, effects, tally };
  }

  const job = echo.jobs.find((j) => j.id === echo.activeJobId) ?? null;
  const actions = Math.max(1, Math.round(dtMs / ECHO_TUNING.ACTION_MS));

  for (let a = 0; a < actions; a++) {
    const here = roomById(echo.roomId) ?? roomById('room-0');
    if (!here) break;
    echo.roomId = here.id;
    const regen = (campfire(here) ? 0.08 : 0.03) * echo.maxHp;

    // Retreat to rest when hurt.
    if (echo.mode !== 'RESTING' && echo.hp < echo.maxHp * ECHO_TUNING.RETREAT_HP) {
      echo.mode = 'RESTING';
      addLog(echo, 'I am hurt; resting before I go on.', now);
    }
    if (echo.mode === 'RESTING') {
      const fire = nextHop(rooms, here.id, campfire);
      if (fire && fire.next !== here.id) {
        echo.roomId = fire.next;
        continue;
      }
      echo.hp = Math.min(echo.maxHp, Math.round(echo.hp + regen));
      if (echo.hp >= echo.maxHp * ECHO_TUNING.RESUME_HP) echo.mode = job ? 'WORKING' : 'IDLE';
      continue;
    }

    if (!job || !jobUnlocked(echo, job)) {
      echo.mode = 'IDLE';
      echo.hp = Math.min(echo.maxHp, Math.round(echo.hp + regen));
      continue;
    }
    echo.mode = 'WORKING';

    // --- What to do in this room -------------------------------------------------
    const foe =
      job.fight &&
      (here.monsters.find(
        (m) => m.id === world.playerTargetId && job.kind === 'FOLLOW' && canFight(echo, m),
      ) ??
        here.monsters.find((m) => canFight(echo, m)));

    const followAway =
      job.kind === 'FOLLOW' && world.playerRoomId && world.playerRoomId !== here.id;
    const routeTarget = job.kind === 'ROUTE' ? job.route?.[echo.routeIndex ?? 0] : undefined;
    const offRoute = job.kind === 'ROUTE' && routeTarget && routeTarget !== here.id;

    if (foe && !followAway && !offRoute) {
      const dmg = echoDamage(echo, job, foe, rng);
      foe.hp = Math.max(0, foe.hp - dmg);
      if (dmg > 0)
        effects.push({ kind: 'DAMAGE', roomId: here.id, monsterId: foe.id, damage: dmg });
      if (foe.hp === 0) {
        effects.push({ kind: 'KILL', roomId: here.id, monsterId: foe.id });
        tally.kills += 1;
        const gold = foe.isBoss ? 40 : 10;
        echo.gold += gold;
        tally.gold += gold;
        echo.knowledge[foe.templateId] = (echo.knowledge[foe.templateId] ?? 0) + 1;
        bumpProficiency(job);
        addLog(echo, `I defeated ${foe.name} in ${here.title}.`, now);
        gainXp(echo, foe.isBoss ? 120 : 35, tally, now);
        continue;
      }
      echo.hp -= monsterDamageToEcho(job, foe, rng);
      if (echo.hp <= 0) {
        echo.hp = 0;
        echo.mode = 'DOWNED';
        echo.downedUntilMs = now + ECHO_TUNING.DOWNED_MS;
        tally.downedTimes += 1;
        addLog(
          echo,
          `${foe.name} knocked me down in ${here.title}. Carry me to a campfire, or I'll get up at the entrance in 5 minutes.`,
          now,
        );
        break;
      }
      continue;
    }

    if (job.loot && !followAway && !offRoute) {
      const room = here;
      const space = ECHO_TUNING.SATCHEL_CAP - echo.satchel.length;
      if (room.items.length > 0 && space > 0) {
        const taken: EquipmentItem[] = room.items.slice(0, space);
        room.items = room.items.slice(taken.length);
        echo.satchel.push(...taken);
        tally.itemsFound += taken.length;
        effects.push({ kind: 'TAKE', roomId: room.id, itemIds: taken.map((i) => i.id) });
        addLog(echo, `I picked up ${taken.map((i) => i.name).join(', ')}.`, now);
        continue;
      }
      if (
        room.items.length > 0 &&
        space <= 0 &&
        !echo.log[0]?.text.startsWith('My satchel is full')
      ) {
        addLog(echo, 'My satchel is full. Take what I carry so I can keep looting.', now);
      }
      const chest = room.chests?.find((c) => canOpen(echo, c));
      if (chest && space > 0) {
        const rule = CHEST_SEAL_RULES[chest.seal];
        if (
          rule.needsLockpick &&
          rng() > lockpickChance(10 + echo.level, 10 + echo.level, chest.tier)
        ) {
          echo.lockpicks -= 1;
          addLog(echo, `My pick snapped on the ${chest.name.toLowerCase()}.`, now);
          continue;
        }
        {
          chest.opened = true;
          echo.satchel.push(...chest.items.slice(0, space));
          echo.lockpicks += chest.lockpicks;
          tally.itemsFound += Math.min(space, chest.items.length);
          effects.push({ kind: 'OPEN_CHEST', roomId: room.id, chestId: chest.id });
          addLog(echo, `I opened the ${chest.name.toLowerCase()} in ${room.title}.`, now);
          continue;
        }
      }
    }

    // --- Where to go next -----------------------------------------------------------
    let hop: { next: string; target: string } | null = null;
    if (job.kind === 'FOLLOW') {
      if (world.playerRoomId) hop = nextHop(rooms, here.id, (r) => r.id === world.playerRoomId);
    } else if (job.kind === 'SCOUT') {
      if (!visited.has(here.id)) {
        visited.add(here.id);
        effects.push({ kind: 'REVEAL', roomId: here.id });
        tally.roomsScouted += 1;
        bumpProficiency(job);
        addLog(echo, `I scouted ${here.title}.`, now);
        continue;
      }
      hop = nextHop(rooms, here.id, (r) => !visited.has(r.id) && !r.isExpedition);
      if (!hop) {
        addLog(echo, 'I have scouted every room I can reach.', now);
        job.runs += 1;
        echo.activeJobId = null;
        echo.mode = 'IDLE';
        break;
      }
    } else if (job.kind === 'FARM') {
      const space = ECHO_TUNING.SATCHEL_CAP - echo.satchel.length;
      hop = nextHop(
        rooms,
        here.id,
        (r) =>
          r.monsters.some((m) => canFight(echo, m)) ||
          (space > 0 && (r.items.length > 0 || (r.chests ?? []).some((c) => canOpen(echo, c)))),
      );
      if (!hop) {
        // Nothing left: wait by a campfire for rooms to refill.
        const fire = nextHop(rooms, here.id, campfire);
        if (fire && fire.next !== here.id) {
          echo.roomId = fire.next;
        } else {
          echo.hp = Math.min(echo.maxHp, Math.round(echo.hp + regen));
          if (!echo.log[0]?.text.startsWith('Waiting for monsters')) {
            addLog(echo, 'Waiting for monsters to come back.', now);
          }
        }
        continue;
      }
    } else if (job.kind === 'ROUTE' && job.route && job.route.length > 0) {
      if (!routeTarget || routeTarget === here.id) {
        const nextIndex = ((echo.routeIndex ?? 0) + 1) % job.route.length;
        if (nextIndex === 0) {
          job.runs += 1;
          bumpProficiency(job);
        }
        echo.routeIndex = nextIndex;
        hop = nextHop(rooms, here.id, (r) => r.id === job.route![nextIndex]);
      } else {
        hop = nextHop(rooms, here.id, (r) => r.id === routeTarget);
      }
    }

    if (hop && hop.next !== here.id) {
      echo.roomId = hop.next;
    } else {
      echo.hp = Math.min(echo.maxHp, Math.round(echo.hp + regen));
    }
  }

  return { echo, effects, tally };
}

/** Save the room sequence the player just played as a repeatable job. */
export function makeRouteJob(
  name: string,
  route: string[],
  fight: boolean,
  loot: boolean,
  nowMs: number,
): EchoJob {
  return {
    id: `route-${nowMs.toString(36)}`,
    name: name.trim().slice(0, 30) || 'My route',
    kind: 'ROUTE' as EchoJobKind,
    route: route.slice(0, ECHO_TUNING.MAX_ROUTE_ROOMS),
    fight,
    loot,
    proficiency: 0,
    runs: 0,
  };
}

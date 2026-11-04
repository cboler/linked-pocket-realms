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
  EchoJobRules,
  EchoLoanOffer,
  EchoLoanReturn,
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

/** Loans: how long, and the most a returning Echo may bring back per hour away. */
export const ECHO_LOAN = {
  DURATIONS_H: [1, 4, 8],
  MAX_XP_PER_HOUR: 300,
  MAX_GOLD_PER_HOUR: 150,
  MAX_ITEMS: 5,
  MAX_KNOWLEDGE_GAIN: 50,
  /** If no return arrives, the Echo walks home on its own this long after the loan ends. */
  SELF_RETURN_GRACE_MS: 24 * 60 * 60_000,
} as const;

export const DEFAULT_JOB_RULES: EchoJobRules = {
  retreatPct: 35,
  skipBosses: false,
  focusTemplateId: null,
};

export function jobRules(job: EchoJob | null): EchoJobRules {
  return { ...DEFAULT_JOB_RULES, ...(job?.rules ?? {}) };
}

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
  /** Monsters recover when the Echo backs off from a fight (no hit-and-run). */
  | { kind: 'HEAL'; roomId: string; monsterId: string }
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

function canFight(echo: EchoCompanion, m: MonsterEntity, job: EchoJob | null = null): boolean {
  if (m.hp <= 0) return false;
  if (!m.isBoss) return true;
  return !jobRules(job).skipBosses && echo.level >= m.level;
}

/** Choose a fight in this room: your target (Follow), then the focus type, then anything. */
function pickFoe(
  echo: EchoCompanion,
  job: EchoJob,
  monsters: MonsterEntity[],
  playerTargetId: string | null,
): MonsterEntity | undefined {
  const fightable = monsters.filter((m) => canFight(echo, m, job));
  const focus = jobRules(job).focusTemplateId;
  return (
    (job.kind === 'FOLLOW' ? fightable.find((m) => m.id === playerTargetId) : undefined) ??
    (focus ? fightable.find((m) => m.templateId === focus) : undefined) ??
    fightable[0]
  );
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

  // Lent to a friend: the friend's browser runs it until it comes home.
  if (echo.mode === 'AWAY') return { echo, effects, tally };

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

    // Retreat to rest when hurt (the job's tactics can change the threshold).
    const retreatAt = Math.max(0.1, Math.min(0.8, jobRules(job).retreatPct / 100));
    if (echo.mode !== 'RESTING' && echo.hp < echo.maxHp * retreatAt) {
      echo.mode = 'RESTING';
      addLog(echo, 'I am hurt; resting before I go on.', now);
      // Backing off lets wounded monsters here recover, unless you're still fighting them.
      if (world.playerRoomId !== here.id) {
        for (const m of here.monsters) {
          if (m.hp > 0 && m.hp < m.maxHp) {
            m.hp = m.maxHp;
            effects.push({ kind: 'HEAL', roomId: here.id, monsterId: m.id });
          }
        }
      }
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
    const foe = job.fight && pickFoe(echo, job, here.monsters, world.playerTargetId);

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
        echo.knowledgeNotes = {
          ...(echo.knowledgeNotes ?? {}),
          [foe.templateId]: { name: foe.name, weakness: foe.weakness },
        };
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
      const focus = jobRules(job).focusTemplateId;
      // Head for the focus monster type first, then anything worth doing.
      hop =
        (focus
          ? nextHop(rooms, here.id, (r) =>
              r.monsters.some((m) => m.templateId === focus && canFight(echo, m, job)),
            )
          : null) ??
        nextHop(
          rooms,
          here.id,
          (r) =>
            r.monsters.some((m) => canFight(echo, m, job)) ||
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

// =============================================================================
// Loans: sending your Echo to a friend's realm
// =============================================================================

export function makeLoanOffer(echo: EchoCompanion, hours: number, nowMs: number): EchoLoanOffer {
  return {
    loanId: `loan-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: echo.name,
    archetype: echo.archetype,
    level: echo.level,
    maxHp: echo.maxHp,
    knowledge: { ...echo.knowledge },
    untilMs: nowMs + hours * 3_600_000,
  };
}

/** The host's working copy of a borrowed Echo. It follows the host and fights beside them. */
export function guestEchoFromOffer(
  offer: EchoLoanOffer,
  roomId: string,
  nowMs: number,
): EchoCompanion {
  const level = Math.max(1, Math.min(60, Math.floor(Number(offer.level) || 1)));
  const maxHp = echoMaxHp(level);
  const jobs = builtInJobs();
  return {
    name: String(offer.name || 'Echo').slice(0, 24),
    archetype: offer.archetype,
    level,
    xp: (level - 1) * 100,
    hp: maxHp,
    maxHp,
    roomId,
    mode: 'WORKING',
    activeJobId: jobs[0].id, // Follow the host
    jobs,
    satchel: [],
    gold: 0,
    shards: 0,
    lockpicks: 0,
    knowledge: Object.fromEntries(
      Object.entries(offer.knowledge ?? {})
        .slice(0, 100)
        .map(([k, v]) => [k, Math.max(0, Math.min(1000, Number(v) || 0))]),
    ),
    lastSimulatedMs: nowMs,
    log: [{ atMs: nowMs, text: 'I arrived to help.' }],
  };
}

/** What the host sends back when a loan ends. */
export function buildLoanReturn(
  loanId: string,
  guest: EchoCompanion,
  startXp: number,
  startKnowledge: Record<string, number>,
): EchoLoanReturn {
  const knowledge: Record<string, number> = {};
  for (const [k, v] of Object.entries(guest.knowledge)) {
    const gain = v - (startKnowledge[k] ?? 0);
    if (gain > 0) knowledge[k] = gain;
  }
  return {
    loanId,
    xp: Math.max(0, guest.xp - startXp),
    gold: guest.gold,
    items: guest.satchel.slice(0, ECHO_LOAN.MAX_ITEMS),
    knowledge,
    notes: guest.log.slice(0, 5).map((l) => l.text),
  };
}

/**
 * Bring a lent Echo home with what it earned, clamped so a friend's browser can't hand
 * back more than the loan could plausibly earn.
 */
export function applyLoanReturn(
  echo: EchoCompanion,
  ret: EchoLoanReturn | null,
  nowMs: number,
  clampItem: (item: EquipmentItem) => EquipmentItem,
): { echo: EchoCompanion; summary: string } {
  const next: EchoCompanion = structuredClone(echo);
  const lent = next.lentTo;
  next.lentTo = undefined;
  next.mode = 'IDLE';
  next.roomId = 'room-0';
  next.lastSimulatedMs = nowMs;
  if (!ret || !lent) {
    addLog(next, 'I came home.', nowMs);
    return { echo: next, summary: `${next.name} came home.` };
  }
  const hours = Math.max(0.25, (Math.min(nowMs, lent.untilMs) - lent.sinceMs) / 3_600_000);
  const xp = Math.max(
    0,
    Math.min(Math.floor(Number(ret.xp) || 0), Math.floor(hours * ECHO_LOAN.MAX_XP_PER_HOUR)),
  );
  const gold = Math.max(
    0,
    Math.min(Math.floor(Number(ret.gold) || 0), Math.floor(hours * ECHO_LOAN.MAX_GOLD_PER_HOUR)),
  );
  const space = ECHO_TUNING.SATCHEL_CAP - next.satchel.length;
  const items = (Array.isArray(ret.items) ? ret.items : [])
    .slice(0, Math.min(ECHO_LOAN.MAX_ITEMS, Math.max(0, space)))
    .map(clampItem);
  next.satchel.push(...items);
  next.gold += gold;
  for (const [k, v] of Object.entries(ret.knowledge ?? {}).slice(0, 100)) {
    const gain = Math.max(0, Math.min(ECHO_LOAN.MAX_KNOWLEDGE_GAIN, Math.floor(Number(v) || 0)));
    next.knowledge[k] = (next.knowledge[k] ?? 0) + gain;
  }
  const tally = emptyTally();
  gainXp(next, xp, tally, nowMs);
  next.hp = next.maxHp;
  addLog(next, `I'm back from ${lent.name}'s realm.`, nowMs);
  for (const note of (ret.notes ?? []).slice(0, 5))
    addLog(next, `(At ${lent.name}'s) ${String(note).slice(0, 120)}`, nowMs);
  const parts = [`${xp} XP`, `${gold} gold`, `${items.length} item(s)`];
  if (tally.levelsGained > 0) parts.push(`reached level ${next.level}`);
  return {
    echo: next,
    summary: `${next.name} is back from ${lent.name}'s realm with ${parts.join(', ')}.`,
  };
}

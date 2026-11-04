# Execution Plan: Astral Echo Pawn Companion (v1)

- **Date**: 2026-11-03
- **Status**: Completed (2026-11-03)
- **Owner**: Claude Code (Opus 5.5) with the project owner

## 1. Goal & Objectives

Turn the Astral Echo from a static fake peer into an opt-in **companion that lives in your home realm**, in the spirit of a Dragon's Dogma pawn:

1. It **levels up** and gets better at the jobs it does.
2. It **acts when switched on and left unattended**: live while the tab is open, plus a capped catch-up when you come back, with a "while you were away" report.
3. It is **interactable**: tap it in the room to talk, see its status, give it a job, teach it, and take its loot.
4. It does **jobs it knows or was taught**: Follow, Scout, Farm, and routes you teach it by playing them yourself ("Watch me").
5. **Monsters come back** (room respawns), so farming works for both you and the Echo.

## 2. Decisions (owner, 2026-11-03)

| Question                      | Decision                                                                                                         |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| How do monsters return?       | **Rooms refill over time** for everyone (also fixes TD-10).                                                      |
| How are jobs taught?          | **Watch me**: the Echo records a run you play and saves it as a repeatable job. Built-in jobs unlock by level.   |
| When does it work unattended? | **Live + catch-up**: acts while the tab is open; on return, simulates the time away (capped) and shows a report. |
| Multiplayer in v1             | **Home realm only**. Visitors can see it in your realm; lending it to other players comes later.                 |

## 3. Context & Background

- Today: `spawnAstralEchoBeacon()` injects one presence record (`Kite_Zero`, in another realm, fixed room, `inCombat: true`); it never moves or acts (ADR-012). The fake neighbor portal goes away; the Echo now lives in your realm.
- Reusable pieces: players in the same room already render as tappable silhouettes (`peersInCurrentRoom`, the viewport's peer action panel); `hydrateFromStorage()` already catches up on offline time (realm cultivation); `RealmProgress` (ADR-013) records cleared monsters; host authority (ADR-014) decides HP and kills while hosting.
- Found while planning: `peersInCurrentRoom` matches room ids only, not realms, so players in another realm's `room-1` show in yours. Fix as part of this work.
- Constraint: the Echo **never uses the broker**. Everything is local, bounded, and cheap.

## 4. Proposed Design

### 4.1 Room respawns

- `RealmProgress.defeatedMonsterKeys` gains timestamps (`defeatedAtMs` per key; old array entries migrate to "now").
- A monster counts as defeated only within its cooldown: **60 min** for regular monsters, **24 h** for bosses. After that it is back at full HP the next time rooms are built, or live (a 60 s check) when nobody is in that room.
- Collected floor items **do not respawn** (no duplication). Loot from farming comes from **drops**: each regular kill has a chance to drop a generated item, seeded by monster id plus respawn count, so drops are deterministic and testable.
- While hosting, respawns go through the host and are broadcast as `ROOM_STATE`.

### 4.2 Echo state (persisted in IndexedDB as `astral_echo_state`)

```ts
interface EchoCompanion {
  name: string; // default 'Kite_Zero', renamable
  archetype: ArchetypeClass; // picked when first enabled
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  roomId: string;
  mode: 'IDLE' | 'WORKING' | 'RESTING' | 'DOWNED';
  downedUntilMs?: number;
  activeJobId: string | null;
  jobs: EchoJob[]; // built-in + taught
  satchel: EquipmentItem[]; // capacity 20
  gold: number;
  shards: number;
  knowledge: Record<string, number>; // kills per monster template → small damage bonus
  lastSimulatedMs: number;
  log: EchoLogEntry[]; // last 50 entries
}

interface EchoJob {
  id: string;
  name: string;
  kind: 'FOLLOW' | 'SCOUT' | 'FARM' | 'ROUTE';
  route?: string[]; // ROUTE: room ids in order
  fight: boolean;
  loot: boolean;
  proficiency: number; // 0–100, +1 per completed run
  runs: number;
}
```

### 4.3 Behavior (`AstralEchoService`, a pure step function + a thin live loop)

- `step(state, world, dtMs, rng) → { state, effects }` is pure and deterministic. Effects are applied through the engine's normal paths (kills recorded in `RealmProgress`, host broadcasts while hosting).
- **Live**: one step every 2 s while enabled and the tab is open.
- **Catch-up**: on load, simulate `min(now − lastSimulatedMs, 8 h)` in coarse 30 s steps (≤ 960 steps, a few ms of work), then show the report.
- **Combat**: simplified duel math from level, class, proficiency, and knowledge. The Echo is deliberately weaker than you (≈70% of a player of the same level) so farming helps without trivializing play. At 0 HP it is **downed** for 5 min, then reappears at the entrance. It never dies permanently and never loses its satchel.
- **Jobs**:
  - **Follow** (unlocked at level 1): stays in your room and attacks your target.
  - **Scout** (level 1): walks to unvisited rooms and reveals them on your map.
  - **Farm** (level 3): cycles through rooms with living monsters, fights, and collects drops into its satchel.
  - **Route** (taught): repeats a recorded room sequence, fighting and looting according to the recording.
- **Leveling**: XP from its kills; each level raises HP and damage. Proficiency speeds up a job and reduces damage taken.
- **Satchel full** (20 items): it stops looting and says so in its log.

### 4.4 Teaching ("Watch me")

- Say `echo watch` or tap **Watch me**: the Echo follows you and records the rooms you enter, whether you fought, and whether you looted.
- `echo done <name>` or **Save as job** stores it as a `ROUTE` job (max 12 rooms, max 8 taught jobs). It can be renamed or forgotten.

### 4.5 Interaction UI

- The Echo appears as a silhouette in its current room (reusing the peer rendering, with a 🤖 badge). Tapping it opens **Talk**.
- **Echo panel** (a tab in the Play Together drawer, also opened by Talk): status (level, HP, mode, where it is), current job with Start/Stop, job list with proficiency, **Watch me** / **Save as job**, satchel with **Take all**, rename, and the log.
- **While you were away** card on return: time simulated (and whether it hit the 8 h cap), kills, rooms scouted, items and gold gathered, levels gained.
- Commands (dual input): `echo status`, `echo follow`, `echo scout`, `echo farm`, `echo route <name>`, `echo stop`, `echo watch`, `echo done <name>`, `echo give`, `bot on` / `bot off`.
- Plain language throughout, 44px targets, works on phones.

### 4.6 Multiplayer (v1)

- The Echo stays in your home realm. If it's in a room when you leave home, it keeps working there (simulated) and catches up when you return.
- While you host, it appears to visitors: the host sends a presence beacon for it, which visitors accept as a relayed packet. Its hits go through the host's own authority path, so visitors see HP change and kills credited.
- Not in v1: taking it into other realms, lending it to visitors.

## 4.7 Added during the build (owner, 2026-11-03)

- **Campfire revival, the same for everyone.** A fallen Echo or player can be carried to a campfire. A carried player is asked whether to get up there or go to the entrance. If your Echo is up when you fall, it carries you; if other players are in the realm, you stay down (monsters ignore you, 3-minute wait) until someone carries you; otherwise you wake at the entrance as before.
- **Class-sealed loot.** Seeded chests: `LOCK` (Hexblade/Artificer + lockpick, a failed try breaks the pick), `ARCANE` (Chronomancer, 20 stamina), `HEAVY` (Vanguard, 25 stamina). Hexblades and Artificers start with 3 lockpicks; more drop from monsters and chests. The Echo opens chests its class can, which makes its class matter.

## 5. Implementation Steps

- [x] **Step 1: Respawns** — timestamped `RealmProgress`, cooldowns, migration, live respawn check, seeded drops; fix `peersInCurrentRoom` realm matching. Tests first.
- [x] **Step 2: Echo model + persistence** — `EchoCompanion`, storage keys, enable/disable (replacing the fake neighbor beacon), rename.
- [x] **Step 3: Simulator** — pure `step()` with Follow/Scout/Farm, combat, downed state, leveling, proficiency, satchel; catch-up with cap and report data. Deterministic unit tests.
- [x] **Step 4: Engine wiring** — live loop, effects through `RealmProgress` and host authority, presence beacon while hosting, commands.
- [x] **Step 5: Watch me** — recording, save, run as `ROUTE`.
- [x] **Step 6: UI** — silhouette + Talk, Echo panel, away report, phone layout.
- [x] **Step 7: Tests & docs** — update the Astral Echo tests in `app.spec.ts` (Kite_Zero now lives in your realm), e2e (turn on, talk, start Scout, see a revealed room), ADR-015, ROADMAP, ARCHITECTURE.

## 6. Verification Plan

- [x] Unit tests pass: `npm test` (`echo-and-chests.spec.ts`: respawn timing, boss cooldown, old-save migration, seeded drops, chest generation and class rules, lockpick break/success, chest persistence, Echo scout/farm/level gate, 8 h cap, downed recovery, campfire carry, falling with an Echo, Watch me, satchel; `mesh-authority.spec.ts`: chest opened through the host, one player carrying another to a campfire with the prompt)
- [x] Lint analysis passes: `npm run lint`
- [x] Formatting passes: `npm run format:check`
- [x] E2E passes: `npm run e2e` (new `echo.spec.ts` on all four viewports, plus the multiplayer project)
- [x] Browser check on phone width: Echo drawn in the room, Talk chip opens the Echo tab, no overflow, all controls ≥ 44px
- [x] No broker calls from the Echo (unit test asserts `fetch` is never called)

## 7. Risks, Ceilings & Rollback

- **Balance**: farming numbers (Echo strength, drop rate, cooldowns, 8 h cap) are first guesses, kept as named constants for tuning.
- **Catch-up is an approximation**: coarse 30 s steps, not a replay of real-time combat.
- **Respawns change the game for everyone**: cleared rooms refill after an hour. This is intended (TD-10).
- **Rollback**: revert the commit. Echo state lives in its own storage key; older builds ignore it. `RealmProgress` migration is one-way, but older builds still read the key list.

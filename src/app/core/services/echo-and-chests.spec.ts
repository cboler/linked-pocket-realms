import { TestBed } from '@angular/core/testing';
import { EquipmentItem, LockedChest, RoomNode } from '../models/domain.models';
import { ECHO_PEER_ID, ECHO_TUNING, nextHop } from './astral-echo';
import { ChaosGateService } from './chaos-gate.service';
import { BOSS_RESPAWN_MS, MONSTER_RESPAWN_MS, MudEngineService } from './mud-engine.service';
import { StorageService } from './storage.service';

const MIN = 60_000;

function reloadEngine(): MudEngineService {
  const reloaded = TestBed.runInInjectionContext(() => new MudEngineService());
  reloaded.stopAtbLoop();
  return reloaded;
}

function makeItem(id: string): EquipmentItem {
  return {
    id,
    name: `Item ${id}`,
    slot: 'Main-Hand',
    rarity: 'Rare',
    weight: 1,
    totalStatBudget: 5,
    statBonuses: { atkBonus: 3 },
    provenance: 'Verified Drop',
    originGateAddress: 'test',
    isLocked: false,
  };
}

function putChest(engine: MudEngineService, seal: LockedChest['seal'], lockpicks = 2): LockedChest {
  const roomId = engine.character().currentRoomId;
  const chest: LockedChest = {
    id: `chest-test-${seal}`,
    name:
      seal === 'LOCK'
        ? 'Iron-banded strongbox'
        : seal === 'ARCANE'
          ? 'Rune-sealed coffer'
          : 'Barred war chest',
    seal,
    tier: 1,
    items: [makeItem(`loot-${seal}`)],
    lockpicks,
    opened: false,
  };
  engine.rooms.update((all) => all.map((r) => (r.id === roomId ? { ...r, chests: [chest] } : r)));
  return chest;
}

function currentChest(engine: MudEngineService): LockedChest | undefined {
  return engine.currentRoom().chests?.[0];
}

function campfireRoom(engine: MudEngineService): RoomNode | undefined {
  return engine.rooms().find((r) => r.legendType === 'safe-campfire' && !r.isExpedition);
}

describe('Room respawns and drops', () => {
  let engine: MudEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(MudEngineService);
    engine.stopAtbLoop();
    engine.completeOnboardingAwakening(
      'Tester',
      'Vanguard',
      'Θ',
      'Scorching',
      'Clockwork',
      'Catacombs',
    );
  });

  it('refills a cleared room after an hour, at full health', async () => {
    const room = engine.rooms().find((r) => r.monsters.some((m) => !m.isBoss && m.hp > 0))!;
    const mob = room.monsters.find((m) => !m.isBoss)!;
    engine.character.update((c) => ({ ...c, currentRoomId: room.id }));
    engine.rooms.update((all) =>
      all.map((r) =>
        r.id === room.id
          ? { ...r, monsters: r.monsters.map((m) => (m.id === mob.id ? { ...m, hp: 0 } : m)) }
          : r,
      ),
    );
    await engine['onMonsterDefeated'](mob);
    const now = Date.now();

    expect(engine.respawnDueMonsters(now + MONSTER_RESPAWN_MS - MIN, true)).toBe(0);
    expect(engine.respawnDueMonsters(now + MONSTER_RESPAWN_MS + MIN, true)).toBeGreaterThan(0);
    const back = engine
      .rooms()
      .find((r) => r.id === room.id)!
      .monsters.find((m) => m.id === mob.id)!;
    expect(back.hp).toBe(back.maxHp);
  });

  it('keeps bosses down for a day', () => {
    const room = engine.rooms().find((r) => r.monsters.some((m) => m.isBoss))!;
    const boss = room.monsters.find((m) => m.isBoss)!;
    const now = Date.now();
    engine.rooms.update((all) =>
      all.map((r) =>
        r.id === room.id
          ? { ...r, monsters: r.monsters.map((m) => (m.id === boss.id ? { ...m, hp: 0 } : m)) }
          : r,
      ),
    );
    engine['recordRealmProgress']('monster', room.id, [boss.id], now);
    expect(engine.respawnDueMonsters(now + 2 * MONSTER_RESPAWN_MS, true)).toBe(0);
    expect(engine.respawnDueMonsters(now + BOSS_RESPAWN_MS + MIN, true)).toBeGreaterThan(0);
  });

  it('migrates old saves (kills without times) so their cooldown starts now', async () => {
    const storage = TestBed.inject(StorageService);
    const room = engine.rooms().find((r) => r.monsters.length > 0 && !r.isExpedition)!;
    const key = `${room.id}/${room.monsters[0].id}`;
    await storage.saveRealmProgress({
      gateAddress: engine.activeGateAddress().formatted,
      defeatedMonsterKeys: [key],
      takenItemKeys: [],
    });
    const reloaded = reloadEngine();
    await vi.waitFor(() => expect(reloaded.character().name).toBe('Tester'));
    await vi.waitFor(() =>
      expect(reloaded.rooms().find((r) => r.id === room.id)?.monsters[0].hp).toBe(0),
    );
    expect(reloaded['realmProgress'].defeatedAt?.[key]).toBeGreaterThan(Date.now() - MIN);
    reloaded.ngOnDestroy();
  });

  it('rolls the same drop for the same kill', () => {
    const room = engine.rooms().find((r) => r.monsters.some((m) => !m.isBoss))!;
    const mob = room.monsters.find((m) => !m.isBoss)!;
    const t = 1_800_000_000_000;
    expect(engine.rollMonsterDrop(room.id, mob, t)).toEqual(
      engine.rollMonsterDrop(room.id, mob, t),
    );
  });
});

describe('Sealed chests', () => {
  let engine: MudEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(MudEngineService);
    engine.stopAtbLoop();
    engine.completeOnboardingAwakening(
      'Tester',
      'Vanguard',
      'Θ',
      'Scorching',
      'Clockwork',
      'Catacombs',
    );
  });

  it('are generated the same way every time, and treasure vaults always have one', () => {
    const gate = TestBed.inject(ChaosGateService);
    const addr = engine.activeGateAddress();
    const a = gate.growRealmToStage(addr, 2);
    const b = gate.growRealmToStage(addr, 2);
    expect(a.map((r) => r.chests)).toEqual(b.map((r) => r.chests));
    const vault = gate.addLockedChests(
      [{ ...a[1], legendType: 'treasure-vault', chests: undefined }],
      addr,
    )[0];
    expect(vault.chests?.length).toBe(1);
  });

  it('only opens for the right class', () => {
    putChest(engine, 'LOCK');
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(false);
    expect(engine.terminalFeed()[0].text).toContain('Only a Hexblade or Artificer');
  });

  it('lets a Hexblade pick a lock; a failed try breaks the pick', () => {
    engine.character.update((c) => ({ ...c, archetype: 'Hexblade', lockpicks: 2 }));
    putChest(engine, 'LOCK', 2);

    engine['combatRng'] = () => 0.99; // fail
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(false);
    expect(engine.character().lockpicks).toBe(1);

    engine['combatRng'] = () => 0; // succeed
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(true);
    expect(engine.currentRoom().items.some((i) => i.id === 'loot-LOCK')).toBe(true);
    expect(engine.character().lockpicks).toBe(1 + 2); // kept the pick, found 2 inside
  });

  it('needs a lockpick, a Chronomancer for arcane seals, and a Vanguard for barred chests', () => {
    engine.character.update((c) => ({ ...c, archetype: 'Artificer', lockpicks: 0 }));
    putChest(engine, 'LOCK');
    engine.openChest();
    expect(engine.terminalFeed()[0].text).toContain('need a lockpick');

    engine.character.update((c) => ({ ...c, archetype: 'Chronomancer' }));
    putChest(engine, 'ARCANE');
    const staminaBefore = engine.character().stamina;
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(true);
    expect(engine.character().stamina).toBe(staminaBefore - 20);

    engine.character.update((c) => ({ ...c, archetype: 'Vanguard' }));
    putChest(engine, 'HEAVY');
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(true);
  });

  it('stay open after a reload, with their loot still on the floor', async () => {
    const gate = TestBed.inject(ChaosGateService);
    // Use a real generated chest so the reloaded realm has it too.
    const withChest = gate
      .growRealmToStage(engine.activeGateAddress(), engine.activeRealmDelta().growthStage ?? 1)
      .find((r) => r.chests?.length && !r.isExpedition);
    expect(withChest).toBeTruthy();
    if (!withChest) return;
    engine.character.update((c) => ({
      ...c,
      currentRoomId: withChest.id,
      archetype:
        withChest.chests![0].seal === 'ARCANE'
          ? 'Chronomancer'
          : withChest.chests![0].seal === 'HEAVY'
            ? 'Vanguard'
            : 'Hexblade',
      lockpicks: 5,
    }));
    engine['combatRng'] = () => 0;
    engine.openChest();
    expect(currentChest(engine)?.opened).toBe(true);

    const reloaded = reloadEngine();
    await vi.waitFor(() => expect(reloaded.character().name).toBe('Tester'));
    await vi.waitFor(() =>
      expect(reloaded.rooms().find((r) => r.id === withChest.id)?.chests?.[0].opened).toBe(true),
    );
    const lootId = withChest.chests![0].items[0].id;
    expect(
      reloaded
        .rooms()
        .find((r) => r.id === withChest.id)
        ?.items.some((i) => i.id === lootId),
    ).toBe(true);
    reloaded.ngOnDestroy();
  });
});

describe('Astral Echo companion', () => {
  let engine: MudEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(MudEngineService);
    engine.stopAtbLoop();
    engine.completeOnboardingAwakening(
      'Tester',
      'Vanguard',
      'Θ',
      'Scorching',
      'Clockwork',
      'Catacombs',
    );
    engine.toggleAstralEchoBot(true);
  });

  afterEach(() => {
    engine.toggleAstralEchoBot(false);
  });

  function rewind(ms: number): void {
    engine.astralEcho.update((e) => (e ? { ...e, lastSimulatedMs: Date.now() - ms } : e));
  }

  it('wakes in your realm, as a class that opens chests you cannot', () => {
    const echo = engine.astralEcho()!;
    expect(echo.archetype).toBe('Hexblade');
    expect(echo.roomId).toBe('room-0');
    expect(engine.peersInCurrentRoom().some((p) => p.peerId === ECHO_PEER_ID)).toBe(true);
  });

  it('scouts rooms while you are away and reports back', () => {
    const before = engine.character().visitedRoomIds.length;
    engine.setEchoJob('SCOUT');
    rewind(20 * MIN);
    engine.advanceEcho();
    expect(engine.character().visitedRoomIds.length).toBeGreaterThan(before);
    const report = engine.echoAwayReport();
    expect(report?.roomsScouted).toBeGreaterThan(0);
    expect(report?.capped).toBe(false);
  });

  it('farms: kills monsters (recorded so rooms refill) and fills its satchel', () => {
    engine.astralEcho.update((e) => (e ? { ...e, level: 8, xp: 700, hp: 178, maxHp: 178 } : e));
    engine.setEchoJob('FARM');
    rewind(2 * 60 * MIN);
    engine.advanceEcho();
    const report = engine.echoAwayReport()!;
    expect(report.kills).toBeGreaterThan(0);
    expect(Object.keys(engine['realmProgress'].defeatedAt ?? {}).length).toBeGreaterThan(0);
    expect(engine.astralEcho()!.gold).toBeGreaterThan(0);
  });

  it('only farms from level 3', () => {
    engine.astralEcho.update((e) => (e ? { ...e, level: 1, xp: 0 } : e));
    engine.setEchoJob('FARM');
    expect(engine.astralEcho()!.activeJobId).toBeNull();
  });

  it('catches up on at most 8 hours, and never calls the network', () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      engine.setEchoJob('SCOUT');
      rewind(20 * 60 * MIN);
      engine.advanceEcho();
      expect(engine.echoAwayReport()?.capped).toBe(true);
      expect(engine.echoAwayReport()?.simulatedMs).toBe(ECHO_TUNING.CATCHUP_CAP_MS);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('gets up at the entrance after 5 minutes down, or right away at a campfire', () => {
    const here = engine.character().currentRoomId;
    engine.astralEcho.update((e) =>
      e ? { ...e, mode: 'DOWNED', hp: 0, roomId: here, downedUntilMs: Date.now() + 5 * MIN } : e,
    );
    engine.carryEcho();
    expect(engine.astralEcho()!.carried).toBe(true);
    const fire = campfireRoom(engine);
    expect(fire).toBeTruthy();
    engine.moveToRoom(fire!.id);
    expect(engine.astralEcho()!.mode).not.toBe('DOWNED');
    expect(engine.astralEcho()!.roomId).toBe(fire!.id);

    engine.astralEcho.update((e) =>
      e
        ? {
            ...e,
            mode: 'DOWNED',
            hp: 0,
            carried: false,
            roomId: here,
            downedUntilMs: Date.now() - 1,
          }
        : e,
    );
    rewind(ECHO_TUNING.LIVE_STEP_MS);
    engine.advanceEcho();
    expect(engine.astralEcho()!.mode).toBe('IDLE');
    expect(engine.astralEcho()!.roomId).toBe('room-0');
  });

  it('carries you to a campfire when you fall, and asks before you get up', () => {
    const fire = campfireRoom(engine)!;
    const mob = engine.rooms().flatMap((r) => r.monsters)[0];
    engine['handlePlayerWipe'](mob);
    const down = engine.playerDowned();
    expect(down?.campfireOffer?.roomId).toBe(fire.id);
    expect(engine.character().currentRoomId).toBe(fire.id);

    engine.acceptCampfireRevival();
    expect(engine.playerDowned()).toBeNull();
    expect(engine.character().hp).toBe(engine.derivedStats().maxHp);
    expect(engine.character().currentRoomId).toBe(fire.id);
  });

  it('wakes you at the entrance when nobody can help', () => {
    engine.toggleAstralEchoBot(false);
    const mob = engine.rooms().flatMap((r) => r.monsters)[0];
    engine['handlePlayerWipe'](mob);
    expect(engine.playerDowned()).toBeNull();
    expect(engine.character().currentRoomId).toBe('room-0');
  });

  it('learns a route by watching you, then runs it', () => {
    const start = engine.character().currentRoomId;
    const hop = nextHop(engine.rooms(), start, (r) => r.id !== start)!;
    engine.startEchoWatch();
    engine.moveToRoom(hop.next);
    engine['onPlayerKill']();
    engine.moveToRoom(start);
    engine.finishEchoWatch('Loop');
    const job = engine.astralEcho()!.jobs.find((j) => j.kind === 'ROUTE');
    expect(job?.name).toBe('Loop');
    expect(job?.route).toEqual([start, hop.next, start]);
    expect(job?.fight).toBe(true);
    engine.setEchoJob('Loop');
    expect(engine.astralEcho()!.activeJobId).toBe(job!.id);
  });

  it('hands over its satchel but keeps its lockpicks', () => {
    engine.astralEcho.update((e) =>
      e ? { ...e, satchel: [makeItem('found-1')], gold: 30, lockpicks: 2 } : e,
    );
    const goldBefore = engine.character().gold;
    engine.takeEchoSatchel();
    expect(engine.character().inventory.some((i) => i.id === 'found-1')).toBe(true);
    expect(engine.character().gold).toBe(goldBefore + 30);
    expect(engine.astralEcho()!.satchel.length).toBe(0);
    expect(engine.astralEcho()!.lockpicks).toBe(2);
  });

  it('follows its tactics: skip bosses, focus a type, rest earlier', () => {
    const echo = engine.astralEcho()!;
    engine.setEchoJob('FOLLOW');
    engine.setEchoJobRules({ skipBosses: true, retreatPct: 65, focusTemplateId: 'x-type' });
    const rules = engine
      .astralEcho()!
      .jobs.find((j) => j.id === engine.astralEcho()!.activeJobId)!.rules!;
    expect(rules).toEqual({ skipBosses: true, retreatPct: 65, focusTemplateId: 'x-type' });
    // Out-of-range values are clamped.
    engine.setEchoJobRules({ retreatPct: 500 });
    expect(engine.astralEcho()!.jobs.find((j) => j.id === echo.jobs[0].id)!.rules!.retreatPct).toBe(
      80,
    );

    // A boss in the room is ignored with skipBosses on.
    const here = engine.character().currentRoomId;
    const boss = engine
      .rooms()
      .flatMap((r) => r.monsters)
      .find((m) => m.isBoss)!;
    engine.astralEcho.update((e) => (e ? { ...e, level: 60, roomId: here } : e));
    engine.rooms.update((all) =>
      all.map((r) => (r.id === here ? { ...r, monsters: [{ ...boss, hp: boss.maxHp }] } : r)),
    );
    rewind(ECHO_TUNING.LIVE_STEP_MS);
    engine.advanceEcho();
    expect(engine.rooms().find((r) => r.id === here)!.monsters[0].hp).toBe(boss.maxHp);
  });

  it('teaches you monster weaknesses it has learned', () => {
    const mob = engine
      .rooms()
      .flatMap((r) => r.monsters)
      .find((m) => !m.isBoss)!;
    engine.astralEcho.update((e) =>
      e
        ? {
            ...e,
            knowledge: { [mob.templateId]: 4 },
            knowledgeNotes: { [mob.templateId]: { name: mob.name, weakness: mob.weakness } },
          }
        : e,
    );
    engine.shareEchoKnowledge();
    expect(engine.character().bestiaryUnlocked[mob.templateId].inspectedLevel).toBe(2);
    expect(engine.terminalFeed()[0].text).toContain('weak to');
  });

  it('walks home on its own if a loan never reports back', () => {
    const now = Date.now();
    engine.astralEcho.update((e) =>
      e
        ? {
            ...e,
            mode: 'AWAY',
            lentTo: {
              loanId: 'l1',
              peerId: 'peer-gone',
              name: 'Gone',
              sinceMs: now - 30 * 3_600_000,
              untilMs: now - 25 * 3_600_000,
            },
          }
        : e,
    );
    engine.advanceEcho(now);
    expect(engine.astralEcho()!.mode).toBe('IDLE');
    expect(engine.astralEcho()!.lentTo).toBeUndefined();
    expect(engine.peersInCurrentRoom().some((p) => p.peerId === ECHO_PEER_ID)).toBe(true);
  });

  it('opens chests matching its class on a farm job', () => {
    engine.astralEcho.update((e) => (e ? { ...e, level: 5, xp: 400, archetype: 'Vanguard' } : e));
    const roomId = engine.astralEcho()!.roomId;
    const chest: LockedChest = {
      id: 'chest-echo',
      name: 'Barred war chest',
      seal: 'HEAVY',
      tier: 1,
      items: [makeItem('echo-chest-loot')],
      lockpicks: 0,
      opened: false,
    };
    // Clear monsters so the chest is the only work there is.
    engine.rooms.update((all) =>
      all.map((r) => ({
        ...r,
        monsters: r.monsters.map((m) => ({ ...m, hp: 0 })),
        chests: r.id === roomId ? [chest] : r.chests,
      })),
    );
    engine.setEchoJob('FARM');
    rewind(10 * ECHO_TUNING.LIVE_STEP_MS);
    engine.advanceEcho();
    expect(engine.rooms().find((r) => r.id === roomId)?.chests?.[0].opened).toBe(true);
    expect(engine.astralEcho()!.satchel.some((i) => i.id === 'echo-chest-loot')).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { MudEngineService } from './mud-engine.service';
import { StorageService } from './storage.service';

/** Builds a second engine on the same storage, the way a page reload would. */
function reloadEngine(): MudEngineService {
  const reloaded = TestBed.runInInjectionContext(() => new MudEngineService());
  reloaded.stopAtbLoop();
  return reloaded;
}

describe('Realm persistence across reloads', () => {
  let engine: MudEngineService;
  let storage: StorageService;
  const extraEngines: MudEngineService[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(MudEngineService);
    storage = TestBed.inject(StorageService);
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

  afterEach(() => {
    for (const e of extraEngines.splice(0)) e.ngOnDestroy();
  });

  function trackReload(): MudEngineService {
    const reloaded = reloadEngine();
    extraEngines.push(reloaded);
    return reloaded;
  }

  it('keeps a defeated monster defeated after reload', async () => {
    const room = engine.rooms().find((r) => r.monsters.length > 0 && !r.isExpedition);
    expect(room).toBeTruthy();
    const mob = room!.monsters[0];
    engine.character.update((c) => ({ ...c, currentRoomId: room!.id }));

    await engine['onMonsterDefeated'](mob);

    const reloaded = trackReload();
    await vi.waitFor(() => expect(reloaded.character().name).toBe('Tester'));
    await vi.waitFor(() => {
      const reloadedRoom = reloaded.rooms().find((r) => r.id === room!.id);
      expect(reloadedRoom?.monsters.find((m) => m.id === mob.id)?.hp).toBe(0);
    });
    expect(reloaded.currentRoom().id).toBe(room!.id);
    expect(reloaded.livingRoomMonsters().some((m) => m.id === mob.id)).toBe(false);
  });

  it('does not bring collected loot back after reload', async () => {
    const room = engine.rooms().find((r) => r.items.length > 0 && !r.isExpedition);
    expect(room).toBeTruthy();
    const item = room!.items[0];
    engine.character.update((c) => ({ ...c, currentRoomId: room!.id }));

    engine.takeRoomItem(item.id);

    const reloaded = trackReload();
    await vi.waitFor(() => expect(reloaded.character().name).toBe('Tester'));
    await vi.waitFor(() => {
      const reloadedRoom = reloaded.rooms().find((r) => r.id === room!.id);
      expect(reloadedRoom?.items.some((i) => i.id === item.id)).toBe(false);
    });
    expect(reloaded.character().inventory.some((i) => i.id === item.id)).toBe(true);
  });

  it('describes the saved room after reload instead of the placeholder sanctum', async () => {
    const target = engine.rooms().find((r) => r.id !== 'room-0' && !r.isExpedition)!;
    engine.moveToRoom(target.id);

    const reloaded = trackReload();
    await vi.waitFor(() => expect(reloaded.character().name).toBe('Tester'));
    await vi.waitFor(() =>
      expect(reloaded.terminalFeed().some((l) => l.text.includes(target.title))).toBe(true),
    );
    expect(reloaded.terminalFeed().some((l) => l.text.includes('Primordial Anchor Chamber'))).toBe(
      false,
    );
  });

  it('keeps the home realm intact while visiting another realm and after returning', async () => {
    const homeGate = engine.activeGateAddress().formatted;
    const grown = { ...engine.activeRealmDelta(), growthStage: 2, vitalityXP: 50 };
    engine.activeRealmDelta.set(grown);
    engine['persistRealmDelta'](grown);

    engine.dialChaosGate('Δ', 'Silent', 'Fungal', 'Observatory', true);
    await vi.waitFor(async () => {
      const savedHome = await storage.loadHomeRealmDelta();
      expect(savedHome?.gateAddress.formatted).toBe(homeGate);
      expect(savedHome?.growthStage).toBe(2);
    });

    engine.returnToHomeRealm();
    expect(engine.activeGateAddress().formatted).toBe(homeGate);
    expect(engine.activeRealmDelta().growthStage).toBe(2);
    expect(engine.activeRealmDelta().vitalityXP).toBe(50);
  });
});

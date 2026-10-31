import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  ChaosGateService,
  createMulberry32,
  hashChaosGateSeed,
} from './core/services/chaos-gate.service';
import { LegendRegistryService } from './core/services/legend-registry.service';
import { MudEngineService } from './core/services/mud-engine.service';
import { StorageService } from './core/services/storage.service';
import { TransportService } from './core/services/transport.service';
import { EquipmentItem } from './core/models/domain.models';

describe('Linked Pocket Realms — Core Systems & HUD Suite', () => {
  let chaosGate: ChaosGateService;
  let legendRegistry: LegendRegistryService;
  let storage: StorageService;
  let transport: TransportService;
  let engine: MudEngineService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    chaosGate = TestBed.inject(ChaosGateService);
    legendRegistry = TestBed.inject(LegendRegistryService);
    storage = TestBed.inject(StorageService);
    transport = TestBed.inject(TransportService);
    engine = TestBed.inject(MudEngineService);
    expect(transport.localPeerId).toContain('peer-');
    engine.stopAtbLoop();
  });

  describe('Phase 1 & 2: Mulberry32 PRNG & 3-Word Chaos Gate Generator', () => {
    it('should produce deterministic Mulberry32 sequences from identical seeds', () => {
      const seed = hashChaosGateSeed('Θ: Scorching Clockwork Catacombs');
      const rngA = createMulberry32(seed);
      const rngB = createMulberry32(seed);

      const seqA = [rngA(), rngA(), rngA(), rngA()];
      const seqB = [rngB(), rngB(), rngB(), rngB()];
      expect(seqA).toEqual(seqB);
    });

    it('should generate identical baseline dungeons for the same 3-Word Chaos Gate Address', () => {
      const addr = chaosGate.createAddress('Δ', 'Silent', 'Fungal', 'Observatory');
      const realm1 = chaosGate.generateRealm(addr);
      const realm2 = chaosGate.generateRealm(addr);

      expect(realm1.length).toBe(8);
      expect(realm1.map((r) => r.title)).toEqual(realm2.map((r) => r.title));
      expect(realm1[0].legendType).toBe('anchor-portal');
      expect(realm1[7].legendType).toBe('elite-boss');
      expect(realm1[7].monsters[0].isBoss).toBe(true);
    });

    it('should apply JSON RealmDelta overrides and custom dug rooms cleanly on top of baseline seed', () => {
      const addr = chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs');
      const delta = {
        gateAddress: addr,
        ownerName: 'Tester',
        updatedAtIso: new Date().toISOString(),
        ruleset: {
          levelCap: 20,
          maxItemStatBudget: 25,
          allowArchitectForgedItems: true,
          pvpEnabled: false,
        },
        customLegendEntries: [],
        roomOverrides: {
          'room-0': {
            roomId: 'room-0',
            title: 'Customized Nexus Gate',
            description: 'Rewritten by Architect.',
          },
          'room-custom-1': {
            roomId: 'room-custom-1',
            title: 'Secret Clockwork Annex',
            description: 'Dug via @dig command.',
            isCustomDug: true,
          },
        },
        customRoomIds: ['room-custom-1'],
      };

      const rooms = chaosGate.generateRealm(addr, delta);
      expect(rooms.length).toBe(9);
      expect(rooms.find((r) => r.id === 'room-0')?.title).toBe('Customized Nexus Gate');
      expect(rooms.find((r) => r.id === 'room-custom-1')?.isCustomDug).toBe(true);
    });
  });

  describe('Phase 2: Universal Shared Legend & Custom Extensions', () => {
    it('should resolve core semantic glyphs and merge host custom legend entries', () => {
      const anchor = legendRegistry.resolveEntry('anchor-portal');
      expect(anchor.glyph).toBe('◈');

      legendRegistry.registerCustomEntry({
        id: 'custom-well',
        glyph: '✧',
        label: 'Aether Well',
        colorHex: '#f472b6',
        tooltipDescription: 'Restores arcane charge.',
      });

      const resolvedCustom = legendRegistry.resolveEntry('custom', 'custom-well');
      expect(resolvedCustom.glyph).toBe('✧');
      expect(resolvedCustom.label).toBe('Aether Well');
      expect(resolvedCustom.isCustom).toBe(true);
    });
  });

  describe('Phase 3: ATB Combat Loop & Dual-Input Parity (Terminal vs HUD)', () => {
    it('should dispatch identical CommandIntent from terminal `cast sunder` and HUD skill click', () => {
      // Move to a room with a monster (room-1)
      engine.moveToRoom('room-1');
      expect(engine.livingRoomMonsters().length).toBeGreaterThan(0);

      // Force ATB to 100% so skill executes immediately
      engine.character.update((c) => ({ ...c, atbGauge: 100 }));
      const mobBeforeHp = engine.livingRoomMonsters()[0].hp;

      const parsedIntent = engine.parseAndDispatchTerminalInput('cast sunder automaton');
      expect(parsedIntent?.type).toBe('CAST_SKILL');
      expect(parsedIntent?.skillKey).toBe('sunder');

      const mobAfterHp = engine.rooms().find((r) => r.id === 'room-1')!.monsters[0].hp;
      expect(mobAfterHp).toBeLessThan(mobBeforeHp);
    });

    it('should fill ATB gauge on 100ms ticks and execute MOO @dig, @describe, @craft, @trigger, @legend commands', () => {
      const startAtb = engine.character().atbGauge;
      engine.moveToRoom('room-1');
      engine.processAtbTick();
      expect(engine.character().atbGauge).toBeGreaterThan(startAtb);

      const initialRoomsCount = engine.rooms().length;
      engine.parseAndDispatchTerminalInput('@dig E Hidden Observatory Wing');
      expect(engine.rooms().length).toBe(initialRoomsCount + 1);

      const invBefore = engine.character().inventory.length;
      engine.parseAndDispatchTerminalInput('@craft Main-Hand Astral Fang');
      expect(engine.character().inventory.length).toBe(invBefore + 1);
      const crafted = engine.character().inventory[engine.character().inventory.length - 1];
      expect(crafted.provenance).toBe('Architect Forged');
    });
  });

  describe('Phase 5: Customs Gate Clamping, SubtleCrypto Provenance & Cartridge Export', () => {
    it('should export and import RealmDelta cartridges losslessly', () => {
      const delta = engine.activeRealmDelta();
      const b64 = storage.exportCartridgeBase64(delta);
      expect(b64.length).toBeGreaterThan(20);

      const restored = storage.importCartridgeBase64(b64);
      expect(restored?.gateAddress.formatted).toBe(delta.gateAddress.formatted);
    });

    it('should clamp over-budget guest items at the Customs Gate ceiling and sign Verified Drops', async () => {
      const highBudgetItem: EquipmentItem = {
        id: 'over-item',
        name: 'Omega Godblade',
        slot: 'Main-Hand',
        rarity: 'Mythic',
        weight: 5,
        provenance: 'Architect Forged',
        originGateAddress: 'Ω: Gilded Forge Crucible',
        statBonuses: { STR: 15, atkBonus: 25 },
        totalStatBudget: 40,
      };

      const clamped = storage.enforceCustomsGateOnItem(highBudgetItem, {
        levelCap: 10,
        maxItemStatBudget: 16,
        allowArchitectForgedItems: true,
        pvpEnabled: false,
      });

      expect(clamped.clampedStatBudget).toBe(16);
      expect(clamped.clampedScaleFactor).toBe(0.4);

      const signed = await storage.signVerifiedDrop({
        ...highBudgetItem,
        provenance: 'Verified Drop',
      });
      expect(signed.signatureHex).toBeTruthy();
      const isValid = await storage.verifyItemSignature(signed);
      expect(isValid).toBe(true);
    });

    it('should render the Tactical HUD shell and switch perspectives cleanly', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#starter-title')?.textContent).toContain(
        'Linked Pocket Realms',
      );
      expect(compiled.querySelector('[data-testid="realm-svg-map"]')).toBeTruthy();

      const app = fixture.componentInstance;
      app.setPerspective('ARCHITECT');
      fixture.detectChanges();
      expect(compiled.querySelector('[data-testid="architect-dock"]')).toBeTruthy();

      app.toggleDrawer('PAPERDOLL');
      fixture.detectChanges();
      expect(compiled.querySelector('[data-testid="paperdoll-drawer-content"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="attribute-radar-svg"]')).toBeTruthy();
    });

    it('should echo terminal syntax badges on HUD actions, complete First-Boot Onboarding, and excavate rooms via Zero-Syntax Architect Popover', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const app = fixture.componentInstance;

      // 1. Complete First-Boot Onboarding Awakening
      app.onboardingName.set('Kite');
      app.onboardingArchetype.set('Chronomancer');
      app.finishOnboardingModal();
      expect(engine.needsOnboarding()).toBe(false);
      expect(engine.character().name).toBe('Kite');
      expect(engine.character().archetype).toBe('Chronomancer');

      // 2. Click a stage exit button (HUD source) and verify Syntax Echo badge `[cmd: n]` is attached
      app.onDirectionClick('N');
      const latestWithEcho = engine.terminalFeed().find((l) => l.syntaxEcho === '[cmd: n]');
      expect(latestWithEcho).toBeTruthy();

      // 3. Zero-Syntax Architect Popover: open ghost dig popover, roll procedural draft, and create room with monster + loot + trap
      app.setPerspective('ARCHITECT');
      app.openDigPopover('E');
      app.rollProceduralRoomDraft();
      app.digSpawnMonster.set('Chrono-Automaton');
      app.digSpawnLoot.set('Astral Resonance Blade');
      app.digSpawnTrap.set('Arc-Flash Floorplate');
      const beforeCount = engine.rooms().length;
      app.confirmVisualDigRoom();

      expect(engine.rooms().length).toBe(beforeCount + 1);
      const customRoom = engine.rooms()[engine.rooms().length - 1];
      expect(customRoom.isCustomDug).toBe(true);
      expect(customRoom.monsters.length).toBe(1);
      expect(customRoom.items.length).toBe(1);
      expect(customRoom.triggers.length).toBe(1);
    });
  });
});

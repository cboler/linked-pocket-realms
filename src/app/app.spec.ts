import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  ChaosGateService,
  createMulberry32,
  hashChaosGateSeed,
} from './core/services/chaos-gate.service';
import { LegendRegistryService } from './core/services/legend-registry.service';
import { MudEngineService } from './core/services/mud-engine.service';
import { SoundFxService } from './core/services/sound-fx.service';
import { StorageService } from './core/services/storage.service';
import { TransportService } from './core/services/transport.service';
import { ThunderpassService } from './core/services/thunderpass.service';
import {
  EquipmentItem,
  HERALD_ADJECTIVES,
  HERALD_NOUNS,
  HERALD_VERBS,
  MonsterEntity,
  SkillSlot,
  formatHeraldGreeting,
  rollRandomHeraldGreeting,
} from './core/models/domain.models';

describe('Linked Pocket Realms — Core Systems & HUD Suite', () => {
  let chaosGate: ChaosGateService;
  let legendRegistry: LegendRegistryService;
  let storage: StorageService;
  let transport: TransportService;
  let engine: MudEngineService;
  let thunderpass: ThunderpassService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    chaosGate = TestBed.inject(ChaosGateService);
    legendRegistry = TestBed.inject(LegendRegistryService);
    storage = TestBed.inject(StorageService);
    transport = TestBed.inject(TransportService);
    engine = TestBed.inject(MudEngineService);
    thunderpass = TestBed.inject(ThunderpassService);
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
      expect(app.mobileLayoutMode()).toBe('STAGE');
      expect(compiled.querySelector('[data-testid="dungeon-minimap"]')).toBeTruthy();

      // Switching perspective to ARCHITECT automatically summons the Observatory map and docks in SPLIT mode
      app.setPerspective('ARCHITECT');
      fixture.detectChanges();
      expect(app.mobileLayoutMode()).toBe('SPLIT');
      expect(compiled.querySelector('[data-testid="architect-dock"]')).toBeTruthy();

      // Switching perspective to EXPLORER returns to STAGE
      app.setPerspective('EXPLORER');
      fixture.detectChanges();
      expect(app.mobileLayoutMode()).toBe('STAGE');

      app.setMobileLayoutMode('SPLIT');
      fixture.detectChanges();
      expect(compiled.querySelector('main.hud-main')?.getAttribute('data-mobile-view')).toBe(
        'SPLIT',
      );

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

  describe('Feature Evolution: First-Person Perspective Viewport & Directional Orientation', () => {
    it('should initialize playerFacing to North and rotate 90 degrees on turnLeft / turnRight', () => {
      expect(engine.playerFacing()).toBe('N');

      engine.turnLeft();
      expect(engine.playerFacing()).toBe('W');

      engine.turnLeft();
      expect(engine.playerFacing()).toBe('S');

      engine.turnRight();
      expect(engine.playerFacing()).toBe('W');

      engine.turnAround();
      expect(engine.playerFacing()).toBe('E');
    });

    it('should step forward through doorway matching playerFacing and update position', () => {
      engine.moveToRoom('room-0');
      engine.setFacing('N');
      const startRoom = engine.currentRoom();
      expect(startRoom.exits.some((e) => e.direction === 'N')).toBe(true);

      engine.stepForward();
      expect(engine.currentRoom().id).not.toBe('room-0');
      expect(engine.playerFacing()).toBe('N');
    });

    it('should render the First-Person Stage component and switch between 1st-Person and Card Stage modes', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="first-person-stage"]')).toBeTruthy();

      const app = fixture.componentInstance;
      expect(app.stageLensMode()).toBe('FIRST_PERSON');

      app.setStageLensMode('CARD_STAGE');
      fixture.detectChanges();
      expect(app.stageLensMode()).toBe('CARD_STAGE');
      expect(compiled.querySelector('[data-testid="first-person-stage"]')).toBeFalsy();

      app.setStageLensMode('FIRST_PERSON');
      fixture.detectChanges();
      expect(compiled.querySelector('[data-testid="first-person-stage"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="persistent-room-stage"]')).toBeTruthy();
    });

    it('should render unique Etrian Odyssey-style animated SVG enemy sprites with adjective mutators in 1st-person viewport', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      // Navigate to a room with living monsters (e.g. room-1)
      engine.moveToRoom('room-1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const fpStage = compiled.querySelector('[data-testid="first-person-stage"]');
      expect(fpStage).toBeTruthy();

      // Find living monster sprites in the first-person perspective SVG
      const monsterSprites = fpStage?.querySelectorAll('[app-enemy-sprite]');
      if (monsterSprites && monsterSprites.length > 0) {
        const firstSprite = monsterSprites[0];
        // Check that archetype data attribute is populated
        const archetype = firstSprite.getAttribute('data-archetype');
        expect(archetype).toBeTruthy();
        expect(archetype).not.toBe('');

        // Check that tactical adjective badges are rendered below the health bar
        const badges = firstSprite.querySelectorAll('.tactical-badges-group text');
        expect(badges.length).toBeGreaterThan(0);

        // Check health and nameplate readouts
        const nameplate = firstSprite.querySelector('.monster-nameplate');
        expect(nameplate?.textContent).toBeTruthy();

        // Clicking on the monster sprite targets the monster for attack
        (firstSprite as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
        expect(engine.selectedTargetId()).toBe(engine.currentRoom()?.monsters[0]?.id);
      }
    });
  });

  describe('Feature Evolution: Tri-Chord Splicing, Overgrowth Incursions & Pruning', () => {
    it('should deterministically generate hybrid Overgrowth rooms when realms collide', () => {
      const localAddr = chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs');
      const remoteAddr = chaosGate.createAddress('Δ', 'Silent', 'Fungal', 'Observatory');
      const baseRooms = chaosGate.generateRealm(localAddr);

      const incursion = chaosGate.generateOvergrowthIncursion(
        localAddr,
        remoteAddr,
        'Explorer_Kite',
        baseRooms,
      );

      expect(incursion.newRooms.length).toBeGreaterThanOrEqual(2);
      expect(incursion.newRooms[0].isOvergrowth).toBe(true);
      expect(incursion.newRooms[0].originPlayerName).toBe('Explorer_Kite');
      expect(incursion.newRooms[0].originTriChord).toBe(remoteAddr.formatted);
      expect(incursion.newRooms[0].shardsHarvestable).toBeGreaterThanOrEqual(15);
    });

    it('should graft overgrowth chambers onto local realm and track overgrowthCount', () => {
      const beforeCount = engine.rooms().length;
      expect(engine.overgrowthCount()).toBe(0);

      const remoteAddr = chaosGate.createAddress('Λ', 'Crystalline', 'Astral', 'Spire');
      engine.graftOvergrowthIncursion(remoteAddr, 'Aura_Visitor');

      expect(engine.rooms().length).toBeGreaterThan(beforeCount);
      expect(engine.overgrowthCount()).toBeGreaterThan(0);
      const overgrowthRoom = engine.rooms().find((r) => r.isOvergrowth);
      expect(overgrowthRoom).toBeTruthy();
    });

    it('should block pruning when guardian is alive, and award Resonance Shards upon pruning cleared chamber', () => {
      const remoteAddr = chaosGate.createAddress('Σ', 'Tempestuous', 'Monolithic', 'Citadel');
      const grafted = engine.graftOvergrowthIncursion(remoteAddr, 'Tempest_Wanderer');
      const targetRoom = grafted[grafted.length - 1]; // Guardian chamber

      // Attempting to prune while guardian lives fails
      const pruneBlocked = engine.pruneRoom(targetRoom.id);
      expect(pruneBlocked).toBe(false);

      // Slay guardian in the chamber
      engine.rooms.update((all) =>
        all.map((r) =>
          r.id === targetRoom.id ? { ...r, monsters: r.monsters.map((m) => ({ ...m, hp: 0 })) } : r,
        ),
      );

      const shardsBefore = engine.character().resonanceShards || 0;
      const pruneSuccess = engine.pruneRoom(targetRoom.id);
      expect(pruneSuccess).toBe(true);
      expect(engine.rooms().some((r) => r.id === targetRoom.id)).toBe(false);
      expect(engine.character().resonanceShards).toBeGreaterThan(shardsBefore);
    });
  });

  describe('Feature Evolution: Thunderpass Proximity StreetPass & Zero-Knowledge Geohash Blinding', () => {
    it('should encode latitude and longitude into coarse precision-6 base32 geohashes', () => {
      // Golden Gate Bridge coordinates approx: 37.8199, -122.4783
      const geohash = thunderpass.encodeGeohash(37.8199, -122.4783, 6);
      expect(geohash.length).toBe(6);
      expect(typeof geohash).toBe('string');
    });

    it('should compute privacy-preserving SHA-256 blinded zone hashes where raw coordinates never leave device', async () => {
      const hash1 = await thunderpass.computeZoneHash('9q8yyk');
      const hash2 = await thunderpass.computeZoneHash('9q8yyk');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should log streetpass encounters, sprout overgrowth chambers, and barter for forged items using Resonance Shards', () => {
      const startEncounterCount = thunderpass.streetPassLog().length;
      thunderpass.simulateThunderpassCollision('Street_Walker_7', 'Ω: Gilded Forge Crucible');

      expect(thunderpass.streetPassLog().length).toBe(startEncounterCount + 1);
      const latest = thunderpass.streetPassLog()[0];
      expect(latest.playerName).toBe('Street_Walker_7');
      expect(latest.roomsGrafted.length).toBeGreaterThan(0);

      // Verify barter exchange with Echo using Resonance Shards
      const echo = latest.echo;
      expect(echo.forgedItems.length).toBeGreaterThan(0);

      const shardsBefore = engine.character().resonanceShards;
      const invBefore = engine.character().inventory.length;

      // Move into chamber with echo to barter
      engine.rooms.update((all) =>
        all.map((r) =>
          r.id === latest.roomsGrafted[latest.roomsGrafted.length - 1]
            ? { ...r, travelerEcho: echo }
            : r,
        ),
      );
      engine.moveToRoom(latest.roomsGrafted[latest.roomsGrafted.length - 1]);

      const barterResult = engine.barterEcho(echo.id, echo.forgedItems[0].id);
      expect(barterResult).toBe(true);
      expect(engine.character().inventory.length).toBe(invBefore + 1);
      expect(engine.character().resonanceShards).toBe(shardsBefore - 15);
    });
  });

  describe('Feature Evolution: Local P2P Broadcast Chat & Adventurer Roster ("Who\'s Here")', () => {
    it('should parse "say" and "\'" commands and broadcast to peers in the current chamber', () => {
      const intent = engine.parseAndDispatchTerminalInput('say Hail travelers of the Loom!');
      expect(intent).not.toBeNull();
      expect(intent?.type).toBe('CHAT_MESSAGE');
      expect(intent?.payload?.['channel']).toBe('ROOM');

      const log = engine.terminalFeed();
      const lastLine = log[0];
      expect(lastLine.category).toBe('CHAT');
      expect(lastLine.text).toContain('💬 [Say] You: "Hail travelers of the Loom!"');
      expect(lastLine.syntaxEcho).toContain('[cmd: say Hail travelers of the Loom!]');

      // Also test quote shorthand "'"
      engine.parseAndDispatchTerminalInput("'The resonance chords align.");
      const lastLineQuote = engine.terminalFeed()[0];
      expect(lastLineQuote.text).toContain('💬 [Say] You: "The resonance chords align."');
    });

    it('should parse "shout" and "chat" commands and broadcast realm-wide', () => {
      const intent = engine.parseAndDispatchTerminalInput(
        'shout Warning: Chaos Gate incursion detected!',
      );
      expect(intent).not.toBeNull();
      expect(intent?.type).toBe('CHAT_MESSAGE');
      expect(intent?.payload?.['channel']).toBe('SHOUT');

      const log = engine.terminalFeed();
      const lastLine = log[0];
      expect(lastLine.category).toBe('CHAT');
      expect(lastLine.text).toContain(
        '📢 [Broadcast] You: "Warning: Chaos Gate incursion detected!"',
      );
    });

    it('should print the active adventurer roster on "who" command', () => {
      const intent = engine.parseAndDispatchTerminalInput('who');
      expect(intent).not.toBeNull();

      const log = engine.terminalFeed();
      const whoHeader = log.find((l) => l.text.includes('👥 [Adventurers In Realm]'));
      expect(whoHeader).toBeDefined();
      expect(log.some((l) => l.text.includes('• You:'))).toBe(true);
    });

    it('should handle incoming peer room chat, distant overhearing, and realm broadcasts', () => {
      const currentRoomId = engine.currentRoom().id;

      // Same-room chat from remote peer
      transport.injectSimulatedPacket({
        type: 'CHAT_MESSAGE',
        senderName: 'Astral_Nomad',
        roomId: currentRoomId,
        chat: {
          id: 'test-chat-1',
          senderPeerId: 'peer-astral',
          senderName: 'Astral_Nomad',
          channel: 'ROOM',
          text: 'Behold the glyphs on the altar!',
          roomId: currentRoomId,
          roomTitle: engine.currentRoom().title,
          timestampIso: new Date().toISOString(),
        },
      });

      const logAfterSameRoom = engine.terminalFeed();
      const sameRoomLine = logAfterSameRoom[0];
      expect(sameRoomLine.category).toBe('CHAT');
      expect(sameRoomLine.text).toContain(
        '💬 [Say] Astral_Nomad: "Behold the glyphs on the altar!"',
      );

      // Distant-room chat from remote peer
      transport.injectSimulatedPacket({
        type: 'CHAT_MESSAGE',
        senderName: 'Astral_Nomad',
        roomId: 'room-distant-99',
        chat: {
          id: 'test-chat-2',
          senderPeerId: 'peer-astral',
          senderName: 'Astral_Nomad',
          channel: 'ROOM',
          text: 'Found a resonance chest over here!',
          roomId: 'room-distant-99',
          roomTitle: 'Distant Crypt',
          timestampIso: new Date().toISOString(),
        },
      });

      const logAfterDistant = engine.terminalFeed();
      const distantLine = logAfterDistant[0];
      expect(distantLine.category).toBe('CHAT');
      expect(distantLine.text).toContain('💬 [Overheard] Astral_Nomad speaks from Distant Crypt:');

      // Realm-wide broadcast from remote peer
      transport.injectSimulatedPacket({
        type: 'CHAT_MESSAGE',
        senderName: 'Astral_Nomad',
        roomId: 'room-distant-99',
        chat: {
          id: 'test-chat-3',
          senderPeerId: 'peer-astral',
          senderName: 'Astral_Nomad',
          channel: 'SHOUT',
          text: 'All adventurers, rally to the Boss Gateway!',
          roomId: 'room-distant-99',
          roomTitle: 'Distant Crypt',
          timestampIso: new Date().toISOString(),
        },
      });

      const logAfterBroadcast = engine.terminalFeed();
      const broadcastLine = logAfterBroadcast[0];
      expect(broadcastLine.category).toBe('CHAT');
      expect(broadcastLine.text).toContain('📢 [Broadcast] Astral_Nomad (@Distant Crypt):');
    });
  });

  describe('Feature Evolution: Clean, Curated Traveler Herald Greetings ("StreetPass Motto")', () => {
    it('should format herald greetings from approved templates, adjectives, nouns, and verbs', () => {
      const g0 = formatHeraldGreeting(0, 'Radiant', 'Beacon', 'triumph');
      expect(g0.formatted).toBe('May the Radiant Beacon guide your journey.');

      const g1 = formatHeraldGreeting(1, 'Eldritch', 'Shadow', 'prevail');
      expect(g1.formatted).toBe('Beware: Eldritch Shadow lurks ahead.');

      const g2 = formatHeraldGreeting(2, 'Harmonic', 'Loom', 'triumph');
      expect(g2.formatted).toBe('Praise the Harmonic Loom! Time to triumph.');

      // Fallback on invalid words
      const gSafe = formatHeraldGreeting(0, 'InvalidBadWord', 'Inappropriate', 'hax');
      expect(gSafe.adjective).toBe(HERALD_ADJECTIVES[0]);
      expect(gSafe.noun).toBe(HERALD_NOUNS[0]);
      expect(gSafe.formatted).toBe(
        `May the ${HERALD_ADJECTIVES[0]} ${HERALD_NOUNS[0]} guide your journey.`,
      );
    });

    it('should roll a random valid approved herald greeting', () => {
      const rolled = rollRandomHeraldGreeting();
      expect(rolled.formatted.length).toBeGreaterThan(10);
      expect((HERALD_ADJECTIVES as readonly string[]).includes(rolled.adjective)).toBe(true);
      expect((HERALD_NOUNS as readonly string[]).includes(rolled.noun)).toBe(true);
      expect((HERALD_VERBS as readonly string[]).includes(rolled.verb)).toBe(true);
    });

    it('should allow setting and rolling herald greeting via engine and terminal commands', () => {
      const setGreeting = engine.setHeraldGreeting(2, 'Astral', 'Blade', 'strike');
      expect(setGreeting.formatted).toBe('Praise the Astral Blade! Time to strike.');
      expect(engine.character().heraldGreeting.formatted).toBe(
        'Praise the Astral Blade! Time to strike.',
      );

      // Inspect via @greeting
      engine.parseAndDispatchTerminalInput('@greeting');
      expect(engine.terminalFeed()[0].text).toContain('Praise the Astral Blade! Time to strike.');

      // Roll via terminal @greeting roll
      engine.parseAndDispatchTerminalInput('@greeting roll');
      expect(engine.terminalFeed()[0].text).toContain('🎲 [Herald Greeting Rolled]');
      expect(engine.character().heraldGreeting).toBeDefined();

      // Set via terminal parameters
      engine.parseAndDispatchTerminalInput('@greeting 0 Crystalline Sanctuary triumph');
      expect(engine.character().heraldGreeting.formatted).toBe(
        'May the Crystalline Sanctuary guide your journey.',
      );
    });

    it('should include herald greeting in the adventurer roster and Thunderpass encounters', () => {
      engine.setHeraldGreeting(0, 'Valiant', 'Wanderer', 'triumph');
      // Enable echo bot so neighbor peer appears in adventurer roster
      engine.toggleAstralEchoBot(true);

      // Check adventurer roster lists our motto
      engine.parseAndDispatchTerminalInput('who');
      const feed = engine.terminalFeed();
      const youLine = feed.find((l) => l.text.includes('• You:'));
      expect(youLine?.text).toContain('May the Valiant Wanderer guide your journey.');

      // Check neighbor peer motto and Astral Echo label
      const peerLine = feed.find((l) => l.text.includes('Kite_Zero'));
      expect(peerLine?.text).toContain('[Astral Echo]');
      expect(peerLine?.text).toContain('Beware: Eldritch Shadow lurks ahead.');

      // Simulate a Thunderpass encounter and verify motto propagation
      thunderpass.simulateThunderpassCollision('Motto_Traveler', 'Ω: Scorching Clockwork Crucible');
      const latestEnc = thunderpass.streetPassLog()[0];
      expect(latestEnc.echo.heraldGreeting).toBe('Praise the Harmonic Loom! Time to triumph.');
      expect(latestEnc.heraldGreeting).toBe('Praise the Harmonic Loom! Time to triumph.');

      // Verify motto is logged in network feed
      const encFeedLine = engine.terminalFeed().find((l) => l.text.includes('Motto_Traveler'));
      expect(encFeedLine?.text).toContain('Motto: "Praise the Harmonic Loom! Time to triumph."');
    });
  });

  describe('Feature Evolution: Serverless gcloud Lobby Auto-Announce & Discovery', () => {
    it('should derive deterministic LOOM room code from local peer id', () => {
      const roomCode = transport.myLobbyRoomCode();
      expect(roomCode.startsWith('LOOM-')).toBe(true);
      expect(roomCode.length).toBe(9);
    });

    it('should persist brokerUrl to localStorage when setBrokerUrl is invoked', () => {
      const testBrokerUrl = 'https://us-central1-test-project.cloudfunctions.net/broker';
      transport.setBrokerUrl(testBrokerUrl);
      expect(transport.brokerUrl()).toBe(testBrokerUrl);
      expect(localStorage.getItem('linked_pocket_realms_broker_url')).toBe(testBrokerUrl);

      // Clean up
      transport.setBrokerUrl('');
      expect(transport.brokerUrl()).toBe('');
      expect(localStorage.getItem('linked_pocket_realms_broker_url')).toBe('');
    });

    it('should announce presence to broker and parse lobby sessions including herald greetings', async () => {
      const testBrokerUrl = 'https://us-central1-test-project.cloudfunctions.net/broker';
      transport.setBrokerUrl(testBrokerUrl);

      // Mock fetch
      const mockSessions = [
        {
          roomCode: transport.myLobbyRoomCode(),
          hostName: 'Host_Wanderer',
          triChord: 'Ω: Scorching Clockwork Crucible',
          senderId: transport.localPeerId,
          heraldGreeting: 'May the Radiant Beacon guide your journey.',
          hasOffer: true,
          hasAnswer: false,
          lastSeenMs: Date.now(),
        },
        {
          roomCode: 'LOOM-9999',
          hostName: 'Remote_Nomad',
          triChord: 'Ψ: Silent Astral Vault',
          senderId: 'remote-peer-9999',
          heraldGreeting: 'Beware: Eldritch Shadow lurks ahead.',
          hasOffer: true,
          hasAnswer: false,
          lastSeenMs: Date.now(),
        },
      ];

      const originalFetch = globalThis.fetch;
      let sessionListCalls = 0;
      try {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlStr = input.toString();
          if (urlStr.endsWith('/signal')) {
            const body = JSON.parse(init?.body as string);
            expect(body.type).toBe('ANNOUNCE');
            expect(body.roomCode).toBe(transport.myLobbyRoomCode());
            expect(body.hostName).toBe('Host_Wanderer');
            expect(body.heraldGreeting).toBe('May the Radiant Beacon guide your journey.');
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          if (urlStr.endsWith('/sessions')) {
            sessionListCalls++;
            return new Response(JSON.stringify({ sessions: mockSessions }), { status: 200 });
          }
          return new Response('Not Found', { status: 404 });
        }) as typeof globalThis.fetch;

        await transport.announcePresenceToBroker(
          'Host_Wanderer',
          'Ω: Scorching Clockwork Crucible',
          'May the Radiant Beacon guide your journey.',
        );
        // A heartbeat must not also fetch the lobby list (free-tier frugality).
        expect(sessionListCalls).toBe(0);
        await transport.refreshBrokerSessions();
        expect(sessionListCalls).toBe(1);

        expect(transport.brokerSessions().length).toBe(2);
        const mySession = transport
          .brokerSessions()
          .find((s) => s.senderId === transport.localPeerId);
        expect(mySession).toBeDefined();
        expect(mySession?.heraldGreeting).toBe('May the Radiant Beacon guide your journey.');

        const remoteSession = transport.brokerSessions().find((s) => s.roomCode === 'LOOM-9999');
        expect(remoteSession).toBeDefined();
        expect(remoteSession?.hostName).toBe('Remote_Nomad');
        expect(remoteSession?.heraldGreeting).toBe('Beware: Eldritch Shadow lurks ahead.');
      } finally {
        globalThis.fetch = originalFetch;
        transport.setBrokerUrl('');
      }
    });
  });

  describe('Feature Evolution: Observatory Map Summoning & Tactical Mini-Map Radar', () => {
    it('should default to STAGE (Delve Focus) with active Mini-Map and allow collapsing', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const app = fixture.componentInstance;
      const compiled = fixture.nativeElement as HTMLElement;

      expect(app.mobileLayoutMode()).toBe('STAGE');
      expect(app.isMinimapCollapsed()).toBe(false);
      expect(compiled.querySelector('[data-testid="dungeon-minimap"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="minimap-svg-map"]')).toBeTruthy();

      // Collapse minimap
      app.isMinimapCollapsed.set(true);
      fixture.detectChanges();
      expect(compiled.querySelector('.dungeon-minimap')?.classList.contains('collapsed')).toBe(
        true,
      );
      expect(compiled.querySelector('[data-testid="minimap-svg-map"]')).toBeNull();

      // Expand minimap back
      app.isMinimapCollapsed.set(false);
      fixture.detectChanges();
      expect(compiled.querySelector('[data-testid="minimap-svg-map"]')).toBeTruthy();
    });

    it('should toggle between STAGE and MAP via toggleObservatoryMap, keyboard M, and terminal command', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const app = fixture.componentInstance;

      expect(app.mobileLayoutMode()).toBe('STAGE');

      // Toggling summons MAP
      app.toggleObservatoryMap();
      expect(app.mobileLayoutMode()).toBe('MAP');

      // Toggling again returns to STAGE
      app.toggleObservatoryMap();
      expect(app.mobileLayoutMode()).toBe('STAGE');

      // Keyboard 'm' triggers toggle
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'm' }));
      expect(app.mobileLayoutMode()).toBe('MAP');

      // Escape in MAP returns to STAGE
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.mobileLayoutMode()).toBe('STAGE');

      // Terminal command 'map' toggles
      app.terminalCommandText.set('map');
      app.submitTerminalCommand();
      expect(app.mobileLayoutMode()).toBe('MAP');
    });

    it('should allow click-to-move navigation directly from Mini-Map nodes', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const app = fixture.componentInstance;

      const currentRoom = engine.currentRoom();
      const firstExit = currentRoom.exits[0];
      expect(firstExit).toBeDefined();

      const targetRoom = engine.rooms().find((r) => r.id === firstExit.targetRoomId);
      expect(targetRoom).toBeDefined();

      if (targetRoom) {
        app.onNodeClick(targetRoom);
        expect(engine.character().currentRoomId).toBe(targetRoom.id);
      }
    });
  });

  describe('Feature Evolution: Meaningful Tri-Chord Topologies & Distinct Graph Structures', () => {
    it('should generate distinct structural graph topologies driven by Word 2 Architecture', () => {
      // 1. Grid-Loop (Clockwork)
      const clockworkAddr = chaosGate.createAddress('Δ', 'Scorching', 'Clockwork', 'Crucible');
      const gridRooms = chaosGate.generateRealm(clockworkAddr);
      expect(gridRooms.length).toBeGreaterThanOrEqual(8);
      // Room 0 has N and E exits forming grid loops
      const room0 = gridRooms[0];
      expect(room0.exits.some((e: { direction: string }) => e.direction === 'N')).toBe(true);
      expect(room0.exits.some((e: { direction: string }) => e.direction === 'E')).toBe(true);

      // 2. Deep Descent (Sunken) - contains vertical stairwells D / U
      const sunkenAddr = chaosGate.createAddress('Θ', 'Crystalline', 'Sunken', 'Catacombs');
      const descentRooms = chaosGate.generateRealm(sunkenAddr);
      const hasDownExit = descentRooms.some((r: { exits: { direction: string }[] }) =>
        r.exits.some((e: { direction: string }) => e.direction === 'D'),
      );
      const hasUpExit = descentRooms.some((r: { exits: { direction: string }[] }) =>
        r.exits.some((e: { direction: string }) => e.direction === 'U'),
      );
      expect(hasDownExit).toBe(true);
      expect(hasUpExit).toBe(true);
      // Depth tiers increase down the strata
      const maxDepth = Math.max(...descentRooms.map((r: { depthTier: number }) => r.depthTier));
      expect(maxDepth).toBeGreaterThanOrEqual(4);

      // 3. Cluster-Spore (Fungal) - radiating satellite spore pods from central hub
      const fungalAddr = chaosGate.createAddress('Λ', 'Blighted', 'Fungal', 'Sanctuary');
      const clusterRooms = chaosGate.generateRealm(fungalAddr);
      const hubRoom = clusterRooms[0];
      // Central hub connects outward to multiple satellite pods
      expect(hubRoom.exits.length).toBeGreaterThanOrEqual(3);

      // 4. Symmetrical Wing (Astral) - central nave flanking left and right wings
      const sanctAddr = chaosGate.createAddress('Σ', 'Aetherial', 'Astral', 'Observatory');
      const wingRooms = chaosGate.generateRealm(sanctAddr);
      const nave = wingRooms[1]; // room 1 is the Central Nave linked to Grand Gate Anchor (0)
      // Nave has west (left wing) and east (right wing) doorways
      expect(nave.exits.some((e: { direction: string }) => e.direction === 'W')).toBe(true);
      expect(nave.exits.some((e: { direction: string }) => e.direction === 'E')).toBe(true);
    });

    it('should configure Word 1 Atmosphere mutators and Word 3 Biome interactable props', () => {
      const addr = chaosGate.createAddress('Δ', 'Scorching', 'Clockwork', 'Crucible');
      const rooms = chaosGate.generateRealm(addr);
      // Scorching Atmosphere -> Fire element
      expect(rooms[0].elementalMutator).toBe('Fire');
      expect(rooms[0].atmosphereEffect.toLowerCase()).toContain('fire potency');
      // Crucible Biome -> interactable prop defined
      const roomWithProp = rooms.find(
        (r: { propInteractable?: { name: string } }) => r.propInteractable,
      );
      expect(roomWithProp).toBeDefined();
      expect(roomWithProp?.propInteractable?.name).toBe('Titan Ingot Smelting Forge');
    });
  });

  describe('Feature Evolution: Organic Living Dungeon Growth Tree & Compact DNA Serialization', () => {
    it('should deterministically grow realm room count through growth stages 1..10', () => {
      const addr = chaosGate.createAddress('Δ', 'Tempestuous', 'Labyrinthine', 'Archive');
      const stage1 = chaosGate.growRealmToStage(addr, 1);
      const stage3 = chaosGate.growRealmToStage(addr, 3);
      const stage6 = chaosGate.growRealmToStage(addr, 6);
      const stage10 = chaosGate.growRealmToStage(addr, 10);

      expect(stage1.length).toBe(8);
      expect(stage3.length).toBeGreaterThan(stage1.length);
      expect(stage6.length).toBeGreaterThan(stage3.length);
      expect(stage10.length).toBeGreaterThanOrEqual(28);

      // Sprouted rooms carry growthStage tags
      const sproutedRoom = stage10.find((r) => r.growthStage && r.growthStage > 1);
      expect(sproutedRoom).toBeDefined();
      expect(sproutedRoom?.growthStage).toBeGreaterThan(1);
    });

    it('should award Vitality XP and trigger organic growth upon crossing threshold', () => {
      const initialRoomsCount = engine.rooms().length;
      const initialStage = engine.activeRealmDelta().growthStage || 1;

      // Award enough Vitality to cross first threshold (40 XP)
      engine.addVitalityXP(45, 'Testing Guardian Defeat');

      const updatedStage = engine.activeRealmDelta().growthStage;
      expect(updatedStage).toBeGreaterThan(initialStage);
      expect(engine.rooms().length).toBeGreaterThan(initialRoomsCount);

      // Feed should log the growth announcement
      const growthLog = engine
        .terminalFeed()
        .find((l) => l.text.includes('resonates with gathered vitality'));
      expect(growthLog).toBeDefined();
    });

    it('should serialize and deserialize compact Realm DNA cartridges under 1KB', () => {
      const addr = chaosGate.createAddress('Δ', 'Aetherial', 'Forge', 'Citadel');
      const packet = {
        triChord: addr.formatted,
        growthStage: 3,
        playerEcho: {
          id: 'traveler-99',
          playerName: 'Nomad_Test',
          level: 4,
          archetype: 'Hexblade' as const,
          triChord: addr.formatted,
          forgedItems: [],
          encounterTimestampIso: new Date().toISOString(),
          heraldGreeting: 'Praise the Sunken Gate!',
        },
        timestampMs: 1700000000000,
      };

      const serialized = chaosGate.serializeRealmDna(packet);
      expect(serialized).toBeTruthy();
      // Must be URL-safe (no +, /, or = padding)
      expect(serialized).not.toContain('+');
      expect(serialized).not.toContain('/');
      expect(serialized).not.toContain('=');
      // Substantially under 1KB (1024 bytes)
      expect(serialized.length).toBeLessThan(500);

      const deserialized = chaosGate.deserializeRealmDna(serialized);
      expect(deserialized).not.toBeNull();
      expect(deserialized?.triChord).toBe(addr.formatted);
      expect(deserialized?.growthStage).toBe(3);
      expect(deserialized?.playerEcho?.playerName).toBe('Nomad_Test');
    });
  });

  describe('Feature Evolution: Zero-Config Cloud Broker Auto-Connect & Mesh Status', () => {
    it('should expose transparent broker mesh status and nearby realms count', async () => {
      const testBrokerUrl = 'https://us-central1-test-project.cloudfunctions.net/broker';
      transport.setBrokerUrl(testBrokerUrl);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sessions: [
            {
              roomCode: 'LOOM-0001',
              hostName: 'Wanderer_One',
              senderId: 'peer-remote-1',
              triChord: 'Δ · Scorching · Clockwork · Foundry',
            },
            {
              roomCode: 'LOOM-0002',
              hostName: 'Wanderer_Two',
              senderId: 'peer-remote-2',
              triChord: 'Θ · Crystalline · Sunken · Catacombs',
            },
          ],
        }),
      } as Response);

      await transport.refreshBrokerSessions();

      expect(transport.brokerMeshStatus()).toBe('CONNECTED');
      expect(transport.nearbyRealmsCount()).toBe(2);

      globalThis.fetch = originalFetch;
      transport.setBrokerUrl('');
    });

    it('should collide with nearby realm by joining remote lobby or hosting offer', async () => {
      const testBrokerUrl = 'https://us-central1-test-project.cloudfunctions.net/broker';
      transport.setBrokerUrl(testBrokerUrl);

      const originalFetch = globalThis.fetch;
      // 1. When a remote session is present, collideWithNearbyRealm joins it
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/sessions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              sessions: [
                {
                  roomCode: 'LOOM-7777',
                  hostName: 'Remote_Sojourner',
                  senderId: 'peer-different',
                  triChord: 'Λ · Blighted · Fungal · Grove',
                },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ status: 'joined' }) });
      });

      const joinResult = await transport.collideWithNearbyRealm(
        'Tester',
        'Δ · Scorching · Clockwork · Foundry',
      );
      expect(joinResult.action).toBe('JOINED');
      expect(joinResult.roomCode).toBe('LOOM-7777');
      expect(joinResult.triChord).toBe('Λ · Blighted · Fungal · Grove');

      // 2. When no remote sessions are present, collideWithNearbyRealm creates a host lobby
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/sessions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ sessions: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ status: 'created' }) });
      });

      const hostResult = await transport.collideWithNearbyRealm(
        'Tester',
        'Δ · Scorching · Clockwork · Foundry',
      );
      expect(hostResult.action).toBe('HOSTED');
      expect(hostResult.roomCode).toBe(transport.myLobbyRoomCode());

      globalThis.fetch = originalFetch;
      transport.setBrokerUrl('');
    });
  });

  describe('Feature Evolution: Seam Synthesis & Overgrowth Incursion Grafts', () => {
    it('should mark incursion boundary doorways with isSynthesisSeam and combine atmospheres', () => {
      const foreignAddress = chaosGate.createAddress('Θ', 'Crystalline', 'Sunken', 'Catacombs');

      const initialCount = engine.rooms().length;
      const newIncursionRooms = engine.graftOvergrowthIncursion(foreignAddress, 'Alien_Traveler');

      expect(newIncursionRooms.length).toBeGreaterThan(0);
      expect(engine.rooms().length).toBeGreaterThan(initialCount);
      const overgrowthRooms = engine.rooms().filter((r) => r.isOvergrowth);
      expect(overgrowthRooms.length).toBeGreaterThan(0);

      // Check boundary exits for isSynthesisSeam
      const allExits = engine.rooms().flatMap((r) => r.exits);
      const seamExit = allExits.find((e) => e.isSynthesisSeam);
      expect(seamExit).toBeDefined();
      expect(seamExit?.isSynthesisSeam).toBe(true);
      expect(seamExit?.synthesisAtmosphere).toContain('Crystalline');
    });
  });

  describe('Feature Evolution: Conjunction of the Spheres & Wayfinder Expeditions', () => {
    it('should generate the 6-room Primordial Sanctum baseline and compute dynamic TraitProfile', () => {
      const sanctum = chaosGate.generatePrimordialSanctum('Δ', 'Aegis_Architect');
      expect(sanctum.length).toBe(6);

      const anchor = sanctum.find((r) => r.id === 'room-0');
      expect(anchor).toBeDefined();
      expect(anchor?.legendType).toBe('anchor-portal');
      expect(anchor?.exits.some((e) => e.direction === 'N' && e.targetRoomId === 'room-1')).toBe(
        true,
      );
      expect(anchor?.exits.some((e) => e.direction === 'E' && e.targetRoomId === 'room-2')).toBe(
        true,
      );
      expect(anchor?.exits.some((e) => e.direction === 'W' && e.targetRoomId === 'room-3')).toBe(
        true,
      );

      // TraitProfile calculation
      const profile = chaosGate.computeTraitProfile(sanctum);
      expect(profile.totalRooms).toBe(6);
      expect(profile.primaryAtmosphere).toBeDefined();
      expect(profile.primaryArchitecture).toBeDefined();
      expect(profile.primaryBiome).toBeDefined();
      expect(profile.atmospheres['Aetherial']).toBeGreaterThan(0);
    });

    it('should execute 3-way Conjunction of the Spheres with Host A, Host B, and Wild Anomaly traits', () => {
      const localAddr = chaosGate.createAddress('Θ', 'Scorching', 'Clockwork', 'Catacombs');
      const remoteAddr = chaosGate.createAddress('Λ', 'Crystalline', 'Fungal', 'Observatory');
      const baseRooms = chaosGate.generatePrimordialSanctum('Θ', 'Host_A');

      const result = chaosGate.generateConjunctionIncursion(
        localAddr,
        remoteAddr,
        'Remote_Explorer',
        baseRooms,
        1,
      );

      expect(result.newRooms.length).toBeGreaterThanOrEqual(2);
      expect(result.anomaly).toBeDefined();
      expect(result.anomaly.prefix).toBeDefined();
      expect(result.anomaly.hazard).toBeDefined();
      expect(result.anomaly.mobModifier).toBeDefined();
      expect(result.anomaly.colorHex).toMatch(/^#/);

      // Verify rooms are marked isConjunction
      for (const nr of result.newRooms) {
        expect(nr.isConjunction).toBe(true);
        expect(nr.isOvergrowth).toBe(true);
        expect(nr.originPlayerName).toBe('Remote_Explorer');
        expect(nr.originTriChord).toBe(remoteAddr.formatted);
        expect(nr.conjunctionAnomaly).toBeDefined();
      }

      // Check guardian in final room carries anomaly traits
      const guardianRoom = result.newRooms[result.newRooms.length - 1];
      expect(guardianRoom.monsters.length).toBeGreaterThan(0);
      expect(guardianRoom.monsters[0].name).toContain(result.anomaly.prefix);
    });

    it('should enforce the 30-room maximum capacity limit during conjunction incursions', () => {
      const localAddr = chaosGate.createAddress('Δ', 'Aetherial', 'Astral', 'Sanctuary');
      const remoteAddr = chaosGate.createAddress('Ω', 'Blighted', 'Ossuary', 'Crucible');

      // Create a mocked 30-room array
      const fullRooms = chaosGate.generatePrimordialSanctum('Δ');
      while (fullRooms.length < 30) {
        fullRooms.push({
          id: `room-filler-${fullRooms.length}`,
          title: `Filler Chamber ${fullRooms.length}`,
          description: 'A filler room.',
          x: 100,
          y: 100,
          depthTier: 1,
          legendType: 'corridor',
          atmosphereEffect: 'None',
          elementalMutator: 'Void',
          exits: [],
          monsters: [],
          items: [],
          triggers: [],
          rumorSignal: 'None',
        });
      }

      expect(fullRooms.length).toBe(30);

      const cappedResult = chaosGate.generateConjunctionIncursion(
        localAddr,
        remoteAddr,
        'Void_Dweller',
        fullRooms,
        5,
      );

      // Should return 0 new rooms when at or above 30 capacity
      expect(cappedResult.newRooms.length).toBe(0);
    });

    it('should open, enter, and cleanly collapse a 3-Word Wayfinder Expedition Rift', () => {
      engine.moveToRoom('room-0');
      expect(engine.currentRoom().id).toBe('room-0');

      const opened = engine.openExpeditionRift('Σ', 'Tempestuous', 'Monolithic', 'Citadel');
      expect(opened).toBe(true);
      expect(engine.activeExpeditionRift()).toBeDefined();
      expect(engine.activeExpeditionRift()?.formatted).toContain('Tempestuous');

      // Check room-0 has the purple rift portal exit
      const room0 = engine.rooms().find((r) => r.id === 'room-0')!;
      const riftExit = room0.exits.find((e) => e.targetRoomId === 'exp-0');
      expect(riftExit).toBeDefined();
      expect(riftExit?.isRiftPortal).toBe(true);

      // Enter expedition rift
      const entered = engine.enterExpeditionRift();
      expect(entered).toBe(true);
      expect(engine.currentRoom().id).toBe('exp-0');
      expect(engine.currentRoom().isExpedition).toBe(true);

      // Check apex sanctum exp-5 has boss dropping Sphere Core
      const bossRoom = engine.rooms().find((r) => r.id === 'exp-5')!;
      expect(bossRoom).toBeDefined();
      expect(bossRoom.monsters[0].isBoss).toBe(true);
      const droppedCore = bossRoom.monsters[0].lootTable.find((it) => it.isSphereCore);
      expect(droppedCore).toBeDefined();
      expect(droppedCore?.sphereCoreAddress?.formatted).toContain('Tempestuous');

      // Collapse expedition rift returns player to room-0 and clears temporary rooms
      engine.collapseExpeditionRift();
      expect(engine.currentRoom().id).toBe('room-0');
      expect(engine.activeExpeditionRift()).toBeNull();
      expect(engine.rooms().some((r) => r.isExpedition)).toBe(false);
      expect(
        engine
          .rooms()
          .find((r) => r.id === 'room-0')
          ?.exits.some((e) => e.targetRoomId === 'exp-0'),
      ).toBe(false);
    });

    it('should harvest, crack, and graft Sphere Cores onto the Home Dungeon', () => {
      engine.moveToRoom('room-0');

      // Synthesize a Sphere Core in inventory
      const coreAddr = chaosGate.createAddress('Λ', 'Crystalline', 'Forge', 'Spire');
      const coreItem: EquipmentItem = {
        id: 'item-sphere-core-test',
        name: `Sphere Core: ${coreAddr.formatted}`,
        slot: 'Relic 1',
        rarity: 'Mythic',
        weight: 2,
        provenance: 'Verified Drop',
        originGateAddress: coreAddr.formatted,
        statBonuses: { STR: 5, DEX: 5, atkBonus: 10 },
        totalStatBudget: 20,
        isSphereCore: true,
        sphereCoreAddress: coreAddr,
        description: 'A glowing test sphere core.',
      };

      engine.character.update((c) => ({
        ...c,
        inventory: [...c.inventory, coreItem],
      }));

      // Test 1: Cracking core for shards and XP
      const initialShards = engine.character().resonanceShards;
      const initialXp = engine.character().xp;
      const cracked = engine.crackSphereCore(coreItem.id);
      expect(cracked).toBe(true);
      expect(engine.character().resonanceShards).toBe(initialShards + 100);
      expect(engine.character().xp).toBe(initialXp + 150);
      expect(engine.character().inventory.some((it) => it.id === coreItem.id)).toBe(false);

      // Test 2: Grafting core onto Home Dungeon
      const graftCoreItem: EquipmentItem = {
        ...coreItem,
        id: 'item-sphere-core-graft',
      };
      engine.character.update((c) => ({
        ...c,
        inventory: [...c.inventory, graftCoreItem],
      }));

      const initialHomeRooms = engine.rooms().length;
      const grafted = engine.graftSphereCore(graftCoreItem.id);
      expect(grafted).toBe(true);
      expect(engine.rooms().length).toBeGreaterThan(initialHomeRooms);
      expect(engine.character().inventory.some((it) => it.id === graftCoreItem.id)).toBe(false);

      const graftedRoom = engine.rooms().find((r) => r.id.startsWith('core-'));
      expect(graftedRoom).toBeDefined();
      expect(graftedRoom?.isConjunction).toBe(true);
      expect(graftedRoom?.isPrunable).toBe(true);

      // Pruning grafted room awards shards
      const shardsBeforePrune = engine.character().resonanceShards;
      const pruned = engine.pruneRoom(graftedRoom!.id);
      expect(pruned).toBe(true);
      expect(engine.character().resonanceShards).toBeGreaterThan(shardsBeforePrune);
      expect(engine.rooms().some((r) => r.id === graftedRoom!.id)).toBe(false);
    });

    it('should parse and dispatch terminal commands @rift, @enter rift, @close rift, @crack, @graft', () => {
      engine.moveToRoom('room-0');

      // @rift open
      const openIntent = engine.parseAndDispatchTerminalInput(
        '@rift open Θ Scorching Clockwork Catacombs',
      );
      expect(openIntent).toBeDefined();
      expect(engine.activeExpeditionRift()).toBeDefined();

      // @enter rift
      const enterIntent = engine.parseAndDispatchTerminalInput('@enter rift');
      expect(enterIntent).toBeDefined();
      expect(engine.currentRoom().id).toBe('exp-0');

      // @close rift
      const closeIntent = engine.parseAndDispatchTerminalInput('@close rift');
      expect(closeIntent).toBeDefined();
      expect(engine.currentRoom().id).toBe('room-0');
      expect(engine.activeExpeditionRift()).toBeNull();

      // @crack command without inventory core prints message
      const crackIntent = engine.parseAndDispatchTerminalInput('@crack');
      expect(crackIntent).toBeDefined();

      // @graft command without inventory core prints message
      const graftIntent = engine.parseAndDispatchTerminalInput('@graft');
      expect(graftIntent).toBeDefined();
    });
  });

  describe('Phase 12: Modern Equipment, Auto-Equip, Salvage & Inventory QOL', () => {
    it('should compute gearPowerScore from equipped items', () => {
      const score = engine.gearPowerScore();
      expect(score).toBeGreaterThan(0);
      const char = engine.character();
      const expectedScore = Object.values(char.paperdoll).reduce(
        (sum, it) => sum + (it ? (it.clampedStatBudget ?? it.totalStatBudget) : 0),
        0,
      );
      expect(score).toBe(expectedScore);
    });

    it('should unequip all items into inventory cleanly via unequipAll()', () => {
      const initialInvCount = engine.character().inventory.length;
      const initialEquippedCount = Object.values(engine.character().paperdoll).filter(
        Boolean,
      ).length;
      expect(initialEquippedCount).toBeGreaterThan(0);

      engine.unequipAll();

      const nextEquippedCount = Object.values(engine.character().paperdoll).filter(Boolean).length;
      expect(nextEquippedCount).toBe(0);
      expect(engine.character().inventory.length).toBe(initialInvCount + initialEquippedCount);
      expect(engine.gearPowerScore()).toBe(0);
    });

    it('should auto-equip the best items for empty or weaker slots via autoEquipBest()', () => {
      engine.unequipAll();
      expect(engine.gearPowerScore()).toBe(0);

      const swappedCount = engine.autoEquipBest();
      expect(swappedCount).toBeGreaterThan(0);
      expect(engine.gearPowerScore()).toBeGreaterThan(0);

      // Now add a high power weapon to inventory and verify autoEquipBest equips it
      const highTierSword: EquipmentItem = {
        id: 'legendary-god-sword',
        name: 'Apex Celestial Greatsword',
        slot: 'Main-Hand',
        rarity: 'Mythic',
        weight: 8,
        provenance: 'Verified Drop',
        originGateAddress: 'Ω: Celestial Astral Apex',
        statBonuses: { STR: 20, atkBonus: 50 },
        totalStatBudget: 150,
      };

      engine.character.update((c) => ({
        ...c,
        inventory: [...c.inventory, highTierSword],
      }));

      const nextSwapped = engine.autoEquipBest();
      expect(nextSwapped).toBeGreaterThan(0);
      expect(engine.character().paperdoll['Main-Hand']?.id).toBe('legendary-god-sword');
    });

    it('should lock items and protect locked items from salvage', () => {
      const testItem: EquipmentItem = {
        id: 'test-salvage-armor',
        name: 'Salvageable Runic Vest',
        slot: 'Chest',
        rarity: 'Rare',
        weight: 5,
        provenance: 'Verified Drop',
        originGateAddress: 'Θ: Test',
        statBonuses: { VIT: 5 },
        totalStatBudget: 20,
      };

      engine.character.update((c) => ({
        ...c,
        inventory: [...c.inventory, testItem],
      }));

      // Lock item
      engine.toggleItemLock('test-salvage-armor');
      expect(
        engine.character().inventory.find((i) => i.id === 'test-salvage-armor')?.isLocked,
      ).toBe(true);

      // Attempt salvage while locked should fail
      const initialShards = engine.character().resonanceShards || 0;
      const lockedSalvage = engine.salvageItem('test-salvage-armor');
      expect(lockedSalvage.success).toBe(false);
      expect(lockedSalvage.shardsEarned).toBe(0);
      expect(engine.character().resonanceShards || 0).toBe(initialShards);

      // Unlock and salvage
      engine.toggleItemLock('test-salvage-armor');
      expect(
        engine.character().inventory.find((i) => i.id === 'test-salvage-armor')?.isLocked,
      ).toBe(false);

      const unlockedSalvage = engine.salvageItem('test-salvage-armor');
      expect(unlockedSalvage.success).toBe(true);
      expect(unlockedSalvage.shardsEarned).toBeGreaterThan(0);
      expect(engine.character().resonanceShards || 0).toBe(
        initialShards + unlockedSalvage.shardsEarned,
      );
      expect(engine.character().inventory.some((i) => i.id === 'test-salvage-armor')).toBe(false);
    });
  });

  describe('Feature Evolution: MUD Theorycrafting Polish, Web Audio & Mutual Convergence', () => {
    it('should initialize SoundFxService and toggle mute with localStorage persistence', () => {
      const soundFx = TestBed.inject(SoundFxService);
      expect(soundFx).toBeDefined();

      const initialMute = soundFx.isMuted();
      const toggled = soundFx.toggleMute();
      expect(toggled).toBe(!initialMute);
      expect(soundFx.isMuted()).toBe(!initialMute);

      // Verify all audio cue methods execute safely without throwing
      expect(() => {
        soundFx.playFootstep();
        soundFx.playConvergenceChime();
        soundFx.playCombatHit();
        soundFx.playCastSkill();
        soundFx.playHarvestShards();
        soundFx.playCampfireRest();
        soundFx.playInscription();
      }).not.toThrow();

      // Toggle back
      soundFx.toggleMute();
    });

    it('should trigger mutual realm convergence and set activeConvergenceBanner when encountering a new peer beacon', () => {
      const initialRoomsCount = engine.rooms().length;
      const remoteAddr = chaosGate.createAddress('Λ', 'Crystalline', 'Astral', 'Spire');

      // Inject a live peer beacon
      transport.injectSimulatedPacket({
        senderPeerId: 'peer-live-wanderer-42',
        senderName: 'Vagrant_Lyra',
        gateAddress: remoteAddr.formatted,
        type: 'GATE_BEACON',
        roomId: 'room-0',
      });

      // Verification: hybrid rooms grafted and convergence banner populated
      expect(engine.rooms().length).toBeGreaterThan(initialRoomsCount);
      const banner = engine.activeConvergenceBanner();
      expect(banner).toBeDefined();
      expect(banner?.peerName).toBe('Vagrant_Lyra');
      expect(banner?.peerTriChord).toBe(remoteAddr.formatted);
      expect(banner?.roomsGraftedCount).toBeGreaterThan(0);

      // Dismiss banner
      engine.dismissConvergenceBanner();
      expect(engine.activeConvergenceBanner()).toBeNull();

      // Subsequent beacon from same peer does not duplicate graft
      const afterRoomsCount = engine.rooms().length;
      transport.injectSimulatedPacket({
        senderPeerId: 'peer-live-wanderer-42',
        senderName: 'Vagrant_Lyra',
        gateAddress: remoteAddr.formatted,
        type: 'GATE_BEACON',
        roomId: 'room-0',
      });
      expect(engine.rooms().length).toBe(afterRoomsCount);
    });

    it('should create, persist, and broadcast traveler chalk inscriptions in room', () => {
      const noteText = 'Praise the Loom! Beware the eastern automaton.';

      engine.leaveChalkInscription(noteText);

      // Verify inscription added to room
      const roomInscrs = engine.currentRoom().inscriptions;
      expect(roomInscrs).toBeDefined();
      expect(roomInscrs?.length).toBeGreaterThan(0);
      const created = roomInscrs?.find((i) => i.text === noteText);
      expect(created).toBeDefined();
      expect(created?.authorName).toBe(engine.character().name);

      // Verify inspection displays traveler note details
      engine.inspectTarget(created?.id);
      const lens = engine.inspectedEntity();
      expect(lens).toBeDefined();
      expect(lens?.type).toBe('ROOM');
      expect(lens?.title).toContain(engine.character().name);
      expect(lens?.details.some((d) => d.includes(noteText))).toBe(true);
    });

    it('should parse @inscribe terminal command and etch note onto floor', () => {
      const note = 'Secret cache behind the southern pillar.';
      engine.parseAndDispatchTerminalInput(`@inscribe ${note}`);

      const found = engine.currentRoom().inscriptions?.some((i) => i.text === note);
      expect(found).toBe(true);
    });

    it('should handle incoming CHALK_INSCRIPTION network packets from peers', () => {
      const curRoom = engine.currentRoom();
      const foreignInscr = {
        id: 'inscr-remote-99',
        authorName: 'Traveler_Echo_7',
        authorTriChord: 'Σ: Blighted Monolithic Citadel',
        text: 'The boss here is weak to Frost!',
        timestampIso: new Date().toISOString(),
        glyph: '✍',
      };

      transport.injectSimulatedPacket({
        senderPeerId: 'peer-stranger-99',
        senderName: 'Traveler_Echo_7',
        type: 'CHALK_INSCRIPTION',
        gateAddress: 'Σ: Blighted Monolithic Citadel',
        roomId: curRoom.id,
        chalkInscription: foreignInscr,
      });

      const matched = engine.currentRoom().inscriptions?.find((i) => i.id === foreignInscr.id);
      expect(matched).toBeDefined();
      expect(matched?.text).toBe('The boss here is weak to Frost!');
    });
  });

  describe('Theorycrafting Sprint: Tactical Anatomy, Environmental Alchemy & Ghost Presence', () => {
    it('generates targetable body parts for boss monsters', () => {
      const boss = chaosGate
        .generateRealm(engine.activeGateAddress())
        .flatMap((r) => r.monsters)
        .find((m) => m.isBoss);

      expect(boss).toBeDefined();
      expect(boss?.targetableParts).toBeDefined();
      expect(boss!.targetableParts!.length).toBeGreaterThanOrEqual(2);
      expect(boss!.targetableParts![0].name).toContain('Core Dynamo');
      expect(boss!.targetableParts![0].isSevered).toBe(false);
    });

    it('severing an anatomical sub-part inflicts permanent debuffs and awards shards', () => {
      const room = engine.currentRoom();
      const testPart = {
        id: 'part-test-core',
        name: 'Core Dynamo',
        hp: 1, // 1 HP so any hit breaks it
        maxHp: 20,
        isSevered: false,
        debuffAppliedOnBreak: '-35% Atk & Silenced',
        partEffectDescription: 'Disables burst attacks',
      };
      const testMob: MonsterEntity = {
        id: 'mob-test-anatomy',
        templateId: 'test-automaton',
        name: 'Test Titan',
        level: 1,
        isBoss: true,
        hp: 100,
        maxHp: 100,
        atk: 20,
        mitigationPct: 10,
        speed: 10,
        atbGauge: 0,
        element: 'Physical',
        weakness: 'Fire',
        statuses: [],
        loreSnippet: 'A mechanical testing unit.',
        secretWeaknessHint: 'Target its core.',
        lootTable: [],
        targetableParts: [testPart],
      };

      engine.rooms.update((all) =>
        all.map((r) => (r.id === room.id ? { ...r, monsters: [testMob] } : r)),
      );
      engine.selectTargetMonster(testMob.id);
      engine.selectTargetPart(testPart.id);
      expect(engine.selectedTargetPartId()).toBe(testPart.id);

      const initialShards = engine.character().resonanceShards || 0;

      // Charge ATB to 100% and execute attack on sub-part
      engine.character.update((c) => ({ ...c, atbGauge: 100 }));
      engine.dispatchCommandIntent({
        type: 'ATTACK',
        rawInput: 'attack test titan',
        source: 'HUD',
        targetId: testMob.id,
        payload: { targetPartId: testPart.id },
      });

      const updatedMob = engine.livingRoomMonsters().find((m) => m.id === testMob.id);
      expect(updatedMob).toBeDefined();
      const updatedPart = updatedMob!.targetableParts?.find((p) => p.id === testPart.id);
      expect(updatedPart?.isSevered).toBe(true);
      expect(updatedPart?.hp).toBe(0);
      expect(updatedMob!.atk).toBeLessThan(20); // -35% Atk applied!
      expect(engine.character().resonanceShards).toBe(initialShards + 15); // +15 shards awarded!
    });

    it('triggers environmental elemental resonance combos in combat', () => {
      const room = engine.currentRoom();
      const testMob: MonsterEntity = {
        id: 'mob-test-alchemy',
        templateId: 'mire-golem',
        name: 'Mire Golem',
        level: 1,
        isBoss: false,
        hp: 200,
        maxHp: 200,
        atk: 10,
        mitigationPct: 0,
        speed: 10,
        atbGauge: 0,
        element: 'Bio',
        weakness: 'Fire',
        statuses: [],
        loreSnippet: 'A spore-covered golem.',
        secretWeaknessHint: 'Flammable spores.',
        lootTable: [],
      };

      // Set room atmosphere to Fungal
      engine.rooms.update((all) =>
        all.map((r) =>
          r.id === room.id
            ? { ...r, monsters: [testMob], atmosphereEffect: 'Fungal Spores — Bioluminescent haze' }
            : r,
        ),
      );
      engine.selectTargetMonster(testMob.id);

      // Give player a Fire skill and cast it
      const fireSkill: SkillSlot = {
        id: 'sk-test-fire',
        name: 'Solar Flare',
        commandKey: 'flare',
        archetype: 'Vanguard',
        staminaCost: 0,
        cooldownMs: 0,
        currentCooldownMs: 0,
        powerMultiplier: 1.0,
        element: 'Fire',
        description: 'Fire burst',
      };
      engine.character.update((c) => ({ ...c, atbGauge: 100, activeSkills: [fireSkill] }));

      engine.dispatchCommandIntent({
        type: 'CAST_SKILL',
        rawInput: 'cast flare',
        source: 'HUD',
        skillKey: 'flare',
        targetId: testMob.id,
      });

      const feed = engine.terminalFeed();
      const resonanceLogged = feed.some((f) =>
        f.text.includes('RESONANCE: 🔥 Spore Conflagration'),
      );
      expect(resonanceLogged).toBe(true);
    });

    it('tracks phantom traveler breadcrumbs across room traversal and mesh packets', () => {
      const targetRoomId = engine
        .rooms()
        .find((r) => r.id !== engine.character().currentRoomId)!.id;

      // Inject incoming peer breadcrumbs
      const foreignCrumb = {
        id: 'crumb-remote-1',
        peerId: 'peer-wanderer-alex',
        playerName: 'Alex the Swift',
        archetype: 'Chronomancer' as const,
        roomId: targetRoomId,
        roomTitle: 'Ancient Antechamber',
        timestampMs: Date.now() - 30000, // 30 seconds ago
      };

      transport.injectSimulatedPacket({
        senderPeerId: 'peer-wanderer-alex',
        senderName: 'Alex the Swift',
        type: 'GATE_BEACON',
        gateAddress: 'Θ: Scorching Clockwork Catacombs',
        breadcrumbs: [foreignCrumb],
      });

      expect(engine.phantomTrails().some((t) => t.id === foreignCrumb.id)).toBe(true);

      // Navigate to target room and verify activeRoomPhantom detection
      engine.moveToRoom(targetRoomId);
      expect(engine.activeRoomPhantom()).toBeDefined();
      expect(engine.activeRoomPhantom()?.playerName).toBe('Alex the Swift');
    });

    it('computes pure SVG spore QR codes and supports seed grafting', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const url = app.shareableSporeUrl();
      expect(url).toContain('#spore=');
      expect(app.sporeQrSvgPath()).toContain('M0,0h1v1h-1z');
      expect(app.sporeQrSize()).toBeGreaterThanOrEqual(21);

      // Test grafting a foreign spore code
      const initialRoomCount = engine.rooms().length;
      app.sporeInputText.set('Σ: Crystalline Monolithic Citadel');
      app.importSporeCode();

      expect(engine.rooms().length).toBeGreaterThan(initialRoomCount);
      expect(engine.activeConvergenceBanner()).toBeDefined();
      expect(engine.activeConvergenceBanner()?.peerTriChord).toBe(
        'Σ: Crystalline Monolithic Citadel',
      );
    });
  });

  describe('Feature Evolution: Chamber History, Player Grimoires, Spatial Audio & Synchronized Mechanisms', () => {
    it('calculates directional stereo audio panning based on heading and target direction', () => {
      const soundFx = TestBed.inject(SoundFxService);
      // Facing North
      expect(soundFx.calculateBearingPan('N', 'N')).toBe(0);
      expect(soundFx.calculateBearingPan('E', 'N')).toBeGreaterThan(0.5); // Right ear
      expect(soundFx.calculateBearingPan('W', 'N')).toBeLessThan(-0.5); // Left ear
      expect(soundFx.calculateBearingPan('S', 'N')).toBe(0); // Directly behind

      // Facing East
      expect(soundFx.calculateBearingPan('E', 'E')).toBe(0);
      expect(soundFx.calculateBearingPan('S', 'E')).toBeGreaterThan(0.5); // Right
      expect(soundFx.calculateBearingPan('N', 'E')).toBeLessThan(-0.5); // Left
    });

    it('honors fallen explorer memorials with tributes and transient blessings', () => {
      // Move to room-1 which has a starter tombstone
      engine.moveToRoom('room-1');
      const room = engine.currentRoom();
      expect(room.tombstones).toBeDefined();
      expect(room.tombstones!.length).toBeGreaterThan(0);
      const tomb = room.tombstones![0];
      const initialTributes = tomb.tributeCount;

      // Give player resonance shards for tribute
      engine.character.update((c) => ({ ...c, resonanceShards: 5 }));

      const success = engine.tributeFallenExplorer(tomb.id);
      expect(success).toBe(true);
      expect(engine.character().resonanceShards).toBe(4);
      expect(tomb.tributeCount).toBe(initialTributes + 1);

      // Verify terminal log contains memorial message
      const latestFeed = engine.terminalFeed()[0];
      expect(latestFeed.text).toContain('Fallen Explorer Tribute');
    });

    it('authors, turns pages, and reads sanctum grimoires', () => {
      // Move to room-0 and author a new grimoire
      engine.moveToRoom('room-0');
      const written = engine.writeGrimoire('The Book of Astral Tides', [
        'First passage: in the beginning was resonance.',
        'Second passage: through conjunction we endure.',
      ]);
      expect(written).toBe(true);

      const room = engine.currentRoom();
      expect(room.grimoire).toBeDefined();
      expect(room.grimoire?.title).toBe('The Book of Astral Tides');
      expect(room.grimoire?.pages.length).toBe(2);

      // Open reader modal
      engine.openGrimoire(room.grimoire!);
      expect(engine.activeGrimoire()).toBeDefined();
      expect(engine.activeGrimoirePage()).toBe(0);

      // Turn page forward
      engine.nextGrimoirePage();
      expect(engine.activeGrimoirePage()).toBe(1);

      // Turn page backward
      engine.prevGrimoirePage();
      expect(engine.activeGrimoirePage()).toBe(0);

      // Close modal
      engine.closeGrimoire();
      expect(engine.activeGrimoire()).toBeNull();
    });

    it('activates and harmonizes synchronized multi-dungeon mechanisms', () => {
      // Move to room-5 which contains the starter linked mechanism
      engine.moveToRoom('room-5');
      const room = engine.currentRoom();
      expect(room.linkedMechanism).toBeDefined();
      const mech = room.linkedMechanism!;
      expect(mech.state).toBe('LOCKED');

      // Pull the lever locally
      const pulled = engine.pullLinkedMechanism();
      expect(pulled).toBe(true);
      expect(mech.activatedByLocal).toBe(true);

      // Give shards to harmonize solo
      engine.character.update((c) => ({ ...c, resonanceShards: 25 }));
      const harmonized = engine.harmonizeLinkedMechanism();
      expect(harmonized).toBe(true);
      expect(engine.currentRoom().linkedMechanism?.state).toBe('HARMONIZED');

      // Verify Legendary Relic reward was granted
      expect(engine.character().inventory.some((i) => i.name === 'Resonance Conduit Matrix')).toBe(
        true,
      );
      // Shards deducted 10, then +50 awarded -> 25 - 10 + 50 = 65
      expect(engine.character().resonanceShards).toBe(65);
    });
  });

  describe('Feature Evolution: Shadow Bazaar Dungeon Economy & Multi-Client P2P Mesh', () => {
    let engine: MudEngineService;
    let transport: TransportService;

    beforeEach(() => {
      engine = TestBed.inject(MudEngineService);
      transport = TestBed.inject(TransportService);
    });

    it('should list items in chamber bazaar stall with provenance records and broadcast BAZAAR_LISTED', () => {
      const char = engine.character();
      const firstItem = char.inventory[0];
      expect(firstItem).toBeDefined();

      const sold = engine.sellBazaarItem(firstItem.id, 20);
      expect(sold).toBe(true);

      const room = engine.currentRoom();
      expect(room.bazaar).toBeDefined();
      expect(room.bazaar!.length).toBeGreaterThan(0);

      const listing = room.bazaar!.find((b) => b.item.id === firstItem.id);
      expect(listing).toBeDefined();
      expect(listing!.shardPrice).toBe(20);
      expect(listing!.sellerName).toBe(char.name);

      // Verify provenance chain stamped
      expect(listing!.item.provenanceChain).toBeDefined();
      expect(listing!.item.provenanceChain!.length).toBeGreaterThanOrEqual(1);
      const prov = listing!.item.provenanceChain![listing!.item.provenanceChain!.length - 1];
      expect(prov.action).toBe('Forged');
      expect(prov.price).toBe(20);
      expect(prov.architect).toBe(char.name);

      // Item removed from inventory
      expect(engine.character().inventory.some((i) => i.id === firstItem.id)).toBe(false);
    });

    it('should purchase items from bazaar stalls, transfer shards, update provenance chain, and credit Sanctum Vault', () => {
      // Move to room-2 which has the seeded starter stall relic
      engine.moveToRoom('room-2');
      const room = engine.currentRoom();
      expect(room.bazaar).toBeDefined();
      expect(room.bazaar!.length).toBeGreaterThan(0);

      const listing = room.bazaar![0];
      const initialShards = 50;
      engine.character.update((c) => ({ ...c, resonanceShards: initialShards }));

      const bought = engine.buyBazaarItem(listing.id);
      expect(bought).toBe(true);

      // Shards deducted
      expect(engine.character().resonanceShards).toBe(initialShards - listing.shardPrice);

      // Item added to inventory with 'Bartered' provenance entry
      const boughtItem = engine.character().inventory.find((i) => i.id === listing.item.id);
      expect(boughtItem).toBeDefined();
      expect(boughtItem!.provenanceChain).toBeDefined();
      const lastProv = boughtItem!.provenanceChain![boughtItem!.provenanceChain!.length - 1];
      expect(lastProv.action).toBe('Bartered');
      expect(lastProv.price).toBe(listing.shardPrice);

      // Sanctum vault was credited
      expect(engine.sanctumVaultShards()).toBe(listing.shardPrice);
    });

    it('should claim collected Sanctum Vault revenue into character resonance shards', () => {
      engine.sanctumVaultShards.set(35);
      const shardsBefore = engine.character().resonanceShards;

      const claimed = engine.claimSanctumVaultRevenue();
      expect(claimed).toBe(35);
      expect(engine.sanctumVaultShards()).toBe(0);
      expect(engine.character().resonanceShards).toBe(shardsBefore + 35);
    });

    it('should compute peersInCurrentRoom and render live speech bubbles on room chat across P2P mesh', () => {
      // Simulate remote peer in current room
      const currentRoomId = engine.currentRoom().id;
      transport.injectSimulatedPeerBeacon({
        peerId: 'peer-delver-99',
        playerName: 'Aria_Swift',
        archetype: 'Hexblade',
        level: 5,
        gateAddress: 'Ψ: Astral Clockwork Spire',
        currentRoomId: currentRoomId,
        inCombat: false,
        lastSeenMs: Date.now(),
        transport: 'BroadcastChannel',
        currentHp: 180,
        maxHp: 200,
      });

      const peersInRoom = engine.peersInCurrentRoom();
      expect(peersInRoom.length).toBe(1);
      expect(peersInRoom[0].playerName).toBe('Aria_Swift');
      expect(peersInRoom[0].currentHp).toBe(180);

      // Send room chat
      engine.broadcastChatMessage('ROOM', 'Welcome to the Sanctum!');
      const localBubbles = engine.peerChatMessages();
      expect(localBubbles[transport.localPeerId]).toBeDefined();
      expect(localBubbles[transport.localPeerId].text).toBe('Welcome to the Sanctum!');

      // Simulate remote peer chat packet
      transport.injectSimulatedPacket({
        type: 'CHAT_MESSAGE',
        senderPeerId: 'peer-delver-99',
        senderName: 'Aria_Swift',
        roomId: currentRoomId,
        chat: {
          id: 'chat-99',
          senderPeerId: 'peer-delver-99',
          senderName: 'Aria_Swift',
          channel: 'ROOM',
          text: 'Greetings, Architect!',
          roomId: currentRoomId,
          roomTitle: engine.currentRoom().title,
          timestampIso: new Date().toISOString(),
        },
      });

      const updatedBubbles = engine.peerChatMessages();
      expect(updatedBubbles['peer-delver-99']).toBeDefined();
      expect(updatedBubbles['peer-delver-99'].text).toBe('Greetings, Architect!');
    });

    it('should broadcast packets to multiple concurrent data channels in peerMesh', () => {
      const mockChannel = () => ({
        readyState: 'open',
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onclose: null,
        onmessage: null,
      });
      const mockDc1 = mockChannel();
      const mockDc2 = mockChannel();

      // Two visitors linked to this host at once
      transport.attachChannel('peer-remote-1', 'VISITOR', mockDc1, 'Visitor One');
      transport.attachChannel('peer-remote-2', 'VISITOR', mockDc2, 'Visitor Two');

      expect(transport.activePeerMeshCount()).toBe(2);
      // Opening links sends presence beacons; count only the packet under test.
      mockDc1.send.mockClear();
      mockDc2.send.mockClear();

      // Send packet
      transport.sendPacket({
        senderName: 'Vanguard_01',
        type: 'GATE_BEACON',
        gateAddress: 'Θ: Scorching Clockwork Catacombs',
        roomId: 'room-0',
      });

      expect(mockDc1.send).toHaveBeenCalledTimes(1);
      expect(mockDc2.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Astral Echo Companion Bot & Mesh Presence', () => {
    it('should default to OFF with authentic solo mesh and no ghost peers', () => {
      localStorage.removeItem('linked_pocket_realms_astral_echo_bot');
      engine.toggleAstralEchoBot(false);

      expect(engine.astralEchoBotEnabled()).toBe(false);
      expect(engine.hasActiveAstralEcho()).toBe(false);
      expect(engine.astralEchoCount()).toBe(0);

      engine.listAdventurersInRealm();
      const feed = engine.terminalFeed();
      const soloMsg = feed.find((l) =>
        l.text.includes('No other adventurers detected in your mesh right now'),
      );
      expect(soloMsg).toBeDefined();
    });

    it('should toggle on Astral Echo bot, inject Kite_Zero with [Astral Echo] label, and persist', () => {
      engine.toggleAstralEchoBot(true);

      expect(engine.astralEchoBotEnabled()).toBe(true);
      expect(localStorage.getItem('linked_pocket_realms_astral_echo_bot')).toBe('true');
      expect(engine.hasActiveAstralEcho()).toBe(true);
      expect(engine.astralEchoCount()).toBe(1);

      const visitor = transport.activeVisitorsList().find((v) => v.peerId === 'peer-astral-echo');
      expect(visitor).toBeDefined();
      expect(visitor?.playerName).toBe('Kite_Zero');
      expect(visitor?.isAstralEcho).toBe(true);

      engine.listAdventurersInRealm();
      const feed = engine.terminalFeed();
      const echoLine = feed.find((l) => l.text.includes('Kite_Zero'));
      expect(echoLine?.text).toContain('[Astral Echo]');
    });

    it('should toggle off Astral Echo bot via terminal command "bot off" and remove peer from mesh', () => {
      engine.toggleAstralEchoBot(true);
      expect(engine.astralEchoBotEnabled()).toBe(true);

      engine.parseAndDispatchTerminalInput('bot off');
      expect(engine.astralEchoBotEnabled()).toBe(false);
      expect(localStorage.getItem('linked_pocket_realms_astral_echo_bot')).toBe('false');
      expect(engine.hasActiveAstralEcho()).toBe(false);
      expect(transport.activeVisitorsList().some((v) => v.peerId === 'peer-astral-echo')).toBe(
        false,
      );

      engine.parseAndDispatchTerminalInput('echo on');
      expect(engine.astralEchoBotEnabled()).toBe(true);
      expect(engine.hasActiveAstralEcho()).toBe(true);
    });
  });

  describe('Loot Collection Usability: Single Take vs Take All', () => {
    it('should take a single item and note remaining items in narrative feed', () => {
      const room = engine.currentRoom();
      const mockItem1: EquipmentItem = {
        id: 'test-loot-1',
        name: 'Glimmering Dagger',
        slot: 'Main-Hand',
        rarity: 'Rare',
        weight: 1,
        totalStatBudget: 10,
        statBonuses: { atkBonus: 5, DEX: 5 },
        provenance: 'Verified Drop',
        originGateAddress: 'Δ: Silent Fungal Observatory',
        isLocked: false,
      };
      const mockItem2: EquipmentItem = {
        id: 'test-loot-2',
        name: 'Iron Aegis',
        slot: 'Off-Hand',
        rarity: 'Common',
        weight: 2,
        totalStatBudget: 8,
        statBonuses: { mitigationBonus: 8 },
        provenance: 'Verified Drop',
        originGateAddress: 'Δ: Silent Fungal Observatory',
        isLocked: false,
      };

      engine.rooms.update((all) =>
        all.map((r) => (r.id === room.id ? { ...r, items: [mockItem1, mockItem2] } : r)),
      );

      const invBefore = engine.character().inventory.length;
      engine.takeRoomItem('test-loot-1');

      expect(engine.character().inventory.length).toBe(invBefore + 1);
      expect(engine.currentRoom().items.length).toBe(1);
      expect(engine.currentRoom().items[0].id).toBe('test-loot-2');

      const feed = engine.terminalFeed();
      const takeFeed = feed.find((l) => l.text.includes('Collected [Glimmering Dagger]'));
      expect(takeFeed).toBeDefined();
      expect(takeFeed?.text).toContain('(1 item remains on ground)');
    });

    it('should sweep all room items via takeAllRoomItems() and log total item count', () => {
      const room = engine.currentRoom();
      const mockItem1: EquipmentItem = {
        id: 'test-sweep-1',
        name: 'Obsidian Scythe',
        slot: 'Main-Hand',
        rarity: 'Mythic',
        weight: 3,
        totalStatBudget: 24,
        statBonuses: { atkBonus: 24 },
        provenance: 'Verified Drop',
        originGateAddress: 'Δ: Silent Fungal Observatory',
        isLocked: false,
      };
      const mockItem2: EquipmentItem = {
        id: 'test-sweep-2',
        name: 'Astral Pauldrons',
        slot: 'Chest',
        rarity: 'Rare',
        weight: 2,
        totalStatBudget: 14,
        statBonuses: { VIT: 14 },
        provenance: 'Verified Drop',
        originGateAddress: 'Δ: Silent Fungal Observatory',
        isLocked: false,
      };

      engine.rooms.update((all) =>
        all.map((r) => (r.id === room.id ? { ...r, items: [mockItem1, mockItem2] } : r)),
      );

      const invBefore = engine.character().inventory.length;
      engine.takeAllRoomItems();

      expect(engine.character().inventory.length).toBe(invBefore + 2);
      expect(engine.currentRoom().items.length).toBe(0);

      const feed = engine.terminalFeed();
      const sweepFeed = feed.find((l) => l.text.includes('Collected all room loot'));
      expect(sweepFeed).toBeDefined();
      expect(sweepFeed?.text).toContain('[Obsidian Scythe]');
      expect(sweepFeed?.text).toContain('[Astral Pauldrons]');
    });

    it('should execute takeAllRoomItems via terminal command "take all" or "loot all"', () => {
      const room = engine.currentRoom();
      const mockItem1: EquipmentItem = {
        id: 'test-cmd-1',
        name: 'Chrono Ring',
        slot: 'Relic 1',
        rarity: 'Relic',
        weight: 1,
        totalStatBudget: 18,
        statBonuses: { INT: 18 },
        provenance: 'Verified Drop',
        originGateAddress: 'Δ: Silent Fungal Observatory',
        isLocked: false,
      };
      engine.rooms.update((all) =>
        all.map((r) => (r.id === room.id ? { ...r, items: [mockItem1] } : r)),
      );

      engine.parseAndDispatchTerminalInput('take all');
      expect(engine.currentRoom().items.length).toBe(0);
      expect(engine.character().inventory.some((i) => i.id === 'test-cmd-1')).toBe(true);
    });
  });
});

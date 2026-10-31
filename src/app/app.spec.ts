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
import { ThunderpassService } from './core/services/thunderpass.service';
import {
  EquipmentItem,
  HERALD_ADJECTIVES,
  HERALD_NOUNS,
  HERALD_VERBS,
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

    it('should render the First-Person Stage component and switch 3-lens layout modes', async () => {
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

      app.setStageLensMode('SPLIT');
      fixture.detectChanges();
      expect(compiled.querySelector('[data-testid="first-person-stage"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="persistent-room-stage"]')).toBeTruthy();
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

      // Check adventurer roster lists our motto
      engine.parseAndDispatchTerminalInput('who');
      const feed = engine.terminalFeed();
      const youLine = feed.find((l) => l.text.includes('• You:'));
      expect(youLine?.text).toContain('May the Valiant Wanderer guide your journey.');

      // Check neighbor peer motto
      const peerLine = feed.find((l) => l.text.includes('Kite_Zero'));
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
            return new Response(JSON.stringify({ sessions: mockSessions }), { status: 200 });
          }
          return new Response('Not Found', { status: 404 });
        }) as typeof globalThis.fetch;

        await transport.announcePresenceToBroker(
          'Host_Wanderer',
          'Ω: Scorching Clockwork Crucible',
          'May the Radiant Beacon guide your journey.',
        );

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
});

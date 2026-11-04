import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArchetypeClass,
  AtmospherePrefix,
  BiomeNoun,
  EchoCompanion,
  EchoJob,
  EquipmentItem,
  HERALD_ADJECTIVES,
  HERALD_NOUNS,
  HERALD_TEMPLATES,
  HERALD_VERBS,
  RealmDnaPacket,
  ServerEraLetter,
  StructuralTheme,
  formatHeraldGreeting,
  rollRandomHeraldGreeting,
} from '../../core/models/domain.models';
import {
  ATMOSPHERE_PREFIXES,
  BIOME_NOUNS,
  CLASS_UTILITY,
  ChaosGateService,
  SERVER_ERAS,
  STRUCTURAL_THEMES,
} from '../../core/services/chaos-gate.service';
import { MudEngineService } from '../../core/services/mud-engine.service';
import { SoundFxService } from '../../core/services/sound-fx.service';
import { StorageService } from '../../core/services/storage.service';
import { ThunderpassService } from '../../core/services/thunderpass.service';
import {
  CONNECTIVITY_NOTE,
  LinkState,
  TransportService,
} from '../../core/services/transport.service';
import { generateQrMatrix, generateQrSvgPath } from '../../core/utils/qr-code.util';
import { ECHO_TUNING, jobUnlocked } from '../../core/services/astral-echo';

@Component({
  selector: 'app-resonance-loom-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './resonance-loom-modal.html',
  styleUrl: './resonance-loom-modal.scss',
})
export class ResonanceLoomModalComponent implements OnDestroy {
  readonly engine = inject(MudEngineService);
  readonly transport = inject(TransportService);
  readonly thunderpass = inject(ThunderpassService);
  readonly chaosGate = inject(ChaosGateService);
  readonly storage = inject(StorageService);
  readonly soundFx = inject(SoundFxService);

  readonly loomActiveTab = signal<
    'WEAVER' | 'WEBRTC' | 'THUNDERPASS' | 'OVERGROWTH' | 'SPORE' | 'ECHO'
  >('WEBRTC');
  readonly echoNameInput = signal<string>('');
  readonly routeNameInput = signal<string>('');
  readonly archetypes: ArchetypeClass[] = ['Vanguard', 'Chronomancer', 'Hexblade', 'Artificer'];
  readonly classUtility = CLASS_UTILITY;
  readonly satchelCap = ECHO_TUNING.SATCHEL_CAP;
  readonly farmUnlockLevel = ECHO_TUNING.FARM_UNLOCK_LEVEL;
  readonly shareConfirmationMessage = signal<string>('');
  readonly exportedCartridgeText = signal<string>('');
  readonly remoteHandshakeInput = signal<string>('');
  readonly connectionMessage = signal<string>('');
  readonly isColliding = signal<boolean>(false);
  readonly connectivityNote = CONNECTIVITY_NOTE;
  readonly visitorCount = computed(() => Object.keys(this.engine.realmVisitors()).length);

  // Spore QR Code & Planar Seed Sharing
  readonly shareableSporeUrl = computed<string>(() => {
    const char = this.engine.character();
    const addr = this.engine.activeGateAddress();
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : 'https://chris.github.io/linked-pocket-realms';
    return `${origin}#spore=${encodeURIComponent(addr.formatted)}&p=${encodeURIComponent(char.name)}&seed=${addr.seed}`;
  });

  readonly sporeQrSvgPath = computed<string>(() => {
    try {
      const url = this.shareableSporeUrl();
      const matrix = generateQrMatrix(url);
      return generateQrSvgPath(matrix);
    } catch {
      return '';
    }
  });

  readonly sporeQrSize = computed<number>(() => {
    try {
      const url = this.shareableSporeUrl();
      const matrix = generateQrMatrix(url);
      return matrix.length;
    } catch {
      return 25;
    }
  });

  readonly copiedSporeSuccess = signal<boolean>(false);
  readonly sporeInput = signal<string>('');

  copySporeUrl(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(this.shareableSporeUrl()).then(() => {
        this.copiedSporeSuccess.set(true);
        setTimeout(() => this.copiedSporeSuccess.set(false), 2500);
      });
    }
  }

  graftForeignSpore(): void {
    const raw = this.sporeInput().trim();
    if (!raw) return;
    let addrStr = raw;
    if (raw.includes('#spore=')) {
      const match = raw.match(/#spore=([^&]+)/);
      if (match) addrStr = decodeURIComponent(match[1]);
    }
    const parsed = this.chaosGate.parseAddressString(addrStr);
    if (parsed) {
      const grafted = this.engine.graftOvergrowthIncursion(parsed, 'Spore Traveler');
      if (grafted.length > 0) {
        this.engine.activeConvergenceBanner.set({
          peerName: 'Spore Traveler',
          peerTriChord: parsed.formatted,
          localTheme: this.engine.activeGateAddress().theme,
          remoteTheme: parsed.theme,
          roomsGraftedCount: grafted.length,
          timestampMs: Date.now(),
        });
        this.soundFx.playConvergenceChime();
        this.soundFx.triggerHaptic('CONVERGENCE');
        this.engine.appendFeed(
          'NETWORK',
          `🌱 [Spore Grafted] Spliced ${grafted.length} rooms from spore seed ${parsed.formatted}!`,
        );
      }
      this.sporeInput.set('');
    } else {
      this.engine.appendFeed(
        'SYSTEM',
        'Invalid spore code or URL. Format must match: "Θ: Scorching Clockwork Catacombs".',
      );
    }
  }

  // Wayfinder Loom & Expedition Rift State
  readonly serverEras = Object.values(SERVER_ERAS);
  readonly atmospherePrefixes = ATMOSPHERE_PREFIXES;
  readonly structuralThemes = STRUCTURAL_THEMES;
  readonly biomeNouns = BIOME_NOUNS;

  readonly riftEra = signal<ServerEraLetter>('Θ');
  readonly riftAtmosphere = signal<AtmospherePrefix>('Scorching');
  readonly riftTheme = signal<StructuralTheme>('Clockwork');
  readonly riftBiome = signal<BiomeNoun>('Catacombs');

  readonly sphereCores = computed<EquipmentItem[]>(() => {
    return this.engine.character().inventory.filter((it) => it.isSphereCore);
  });

  // Approved Herald Greeting Tuning Form
  readonly heraldTemplates = HERALD_TEMPLATES;
  readonly heraldAdjectives = HERALD_ADJECTIVES;
  readonly heraldNouns = HERALD_NOUNS;
  readonly heraldVerbs = HERALD_VERBS;

  readonly heraldTemplateId = signal<number>(0);
  readonly heraldAdjective = signal<string>(HERALD_ADJECTIVES[0]);
  readonly heraldNoun = signal<string>(HERALD_NOUNS[0]);
  readonly heraldVerb = signal<string>(HERALD_VERBS[0]);

  readonly heraldPreview = computed<string>(
    () =>
      formatHeraldGreeting(
        this.heraldTemplateId(),
        this.heraldAdjective(),
        this.heraldNoun(),
        this.heraldVerb(),
      ).formatted,
  );

  constructor() {
    // "Talk" on the Echo opens this drawer on the Echo tab.
    effect(() => {
      if (this.engine.pendingLoomTab() === 'ECHO') {
        this.engine.pendingLoomTab.set(null);
        this.setLoomActiveTab('ECHO');
      }
    });
    this.refreshCartridgeText();
    // The lobby is only fetched while its tab is on screen.
    this.transport.setLobbyBrowsing(this.loomActiveTab() === 'WEBRTC');
  }

  ngOnDestroy(): void {
    this.transport.setLobbyBrowsing(false);
  }

  isJobUnlocked(echo: EchoCompanion, job: EchoJob): boolean {
    return jobUnlocked(echo, job);
  }

  jobDescription(job: EchoJob): string {
    switch (job.kind) {
      case 'FOLLOW':
        return 'Stays with you and fights your target';
      case 'SCOUT':
        return "Explores rooms you haven't seen";
      case 'FARM':
        return 'Clears rooms and collects loot';
      default:
        return `${job.route?.length ?? 0} rooms${job.fight ? ', fights' : ''}${job.loot ? ', loots' : ''}`;
    }
  }

  setLoomActiveTab(
    tab: 'WEAVER' | 'WEBRTC' | 'THUNDERPASS' | 'OVERGROWTH' | 'SPORE' | 'ECHO',
  ): void {
    this.loomActiveTab.set(tab);
    this.transport.setLobbyBrowsing(tab === 'WEBRTC');
    if (tab === 'WEAVER') {
      this.refreshCartridgeText();
    }
  }

  /** Plain words for a link's state. */
  linkStateLabel(state: LinkState): string {
    switch (state) {
      case 'OPEN':
        return 'Connected';
      case 'CONNECTING':
        return 'Connecting…';
      case 'FAILED':
        return "Couldn't connect";
      default:
        return 'Disconnected';
    }
  }

  toggleHosting(): void {
    const open = !this.transport.hostingOpen();
    const char = this.engine.character();
    this.transport.setLocalProfile({
      name: char.name,
      gateAddress: this.engine.homeGateAddress().formatted,
      greeting: char.heraldGreeting?.formatted,
      atHome: !this.engine.isVisitingExternalRealm(),
    });
    this.transport.setHostingOpen(open);
  }

  async joinLobby(roomCode: string): Promise<void> {
    this.connectionMessage.set('');
    const sent = await this.transport.joinBrokerSession(roomCode);
    this.connectionMessage.set(
      sent
        ? 'Join request sent. Hosts check for visitors about every 20 seconds, so this can take a moment.'
        : 'Could not send the join request.',
    );
  }

  refreshCartridgeText(): void {
    const delta = this.engine.activeRealmDelta();
    if (delta) {
      this.exportedCartridgeText.set(this.storage.exportCartridgeBase64(delta));
    }
  }

  shareRealmLink(): void {
    const delta = this.engine.activeRealmDelta();
    const char = this.engine.character();
    const dnaPacket: RealmDnaPacket = {
      triChord: delta.gateAddress.formatted,
      growthStage: delta.growthStage || 1,
      customRoomDeltas: Object.values(delta.roomOverrides || {}),
      playerEcho: {
        id: char.id,
        playerName: char.name,
        level: char.level,
        archetype: char.archetype,
        triChord: delta.gateAddress.formatted,
        heraldGreeting: char.heraldGreeting?.formatted,
        forgedItems: char.inventory.slice(0, 2),
        encounterTimestampIso: new Date().toISOString(),
      },
      timestampMs: Date.now(),
    };

    const spore = this.chaosGate.serializeRealmDna(dnaPacket);
    const url = `${window.location.origin}${window.location.pathname}?spore=${spore}`;

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      this.shareConfirmationMessage.set('Copied Shareable Realm Link (?spore=...) to clipboard!');
      setTimeout(() => this.shareConfirmationMessage.set(''), 4500);
    } else {
      this.shareConfirmationMessage.set(`Share Link: ${url}`);
    }
    this.engine.appendFeed(
      'NETWORK',
      `🔗 [Cartridge Link] Encoded Realm DNA (${spore.length} chars) into share link: ${url}`,
    );
  }

  async onCollideWithNearbyRealm(): Promise<void> {
    if (this.isColliding()) return;
    this.isColliding.set(true);
    try {
      const char = this.engine.character();
      const addr = this.engine.homeGateAddress().formatted;
      const greeting = char.heraldGreeting?.formatted;
      const result = await this.transport.collideWithNearbyRealm(char.name, addr, greeting);
      // A joined host's realm opens automatically once the connection is up.
      this.engine.appendFeed(
        'NETWORK',
        result.action === 'JOINED'
          ? `⚡ Asked ${result.roomCode} (${result.triChord ?? 'a nearby realm'}) to let you in.`
          : `⚡ No one else is in the lobby, so your dungeon is now open to visitors (${result.roomCode}).`,
      );
    } finally {
      this.isColliding.set(false);
    }
  }

  importRealmCartridge(): void {
    const raw = this.exportedCartridgeText().trim();
    if (!raw) return;
    const delta = this.storage.importCartridgeBase64(raw);
    if (!delta) {
      this.engine.appendFeed(
        'SYSTEM',
        '⚠️ Failed to import cartridge: Invalid or corrupted Base64.',
      );
      return;
    }
    this.engine.dialChaosGate(
      delta.gateAddress.era,
      delta.gateAddress.atmosphere,
      delta.gateAddress.theme,
      delta.gateAddress.biome,
      true,
      delta,
    );
  }

  async generateJoinCode(): Promise<void> {
    const code = await this.transport.createJoinCode();
    this.connectionMessage.set(
      code
        ? 'Send this join code to your friend. Then paste the reply code they send back.'
        : 'This browser does not support direct connections.',
    );
  }

  async useConnectionCode(): Promise<void> {
    const token = this.remoteHandshakeInput();
    if (!token.trim()) return;
    const result = await this.transport.useConnectionCode(token);
    this.connectionMessage.set(result.message);
    if (result.ok) this.remoteHandshakeInput.set('');
  }

  scanBleRelic(): void {
    void this.thunderpass.scanNearbyBleRelic();
  }

  simulateThunderpassIncursion(): void {
    this.thunderpass.simulateThunderpassCollision();
  }

  rollHeraldGreeting(): void {
    const rolled = rollRandomHeraldGreeting();
    this.heraldTemplateId.set(rolled.templateId);
    this.heraldAdjective.set(rolled.adjective);
    this.heraldNoun.set(rolled.noun);
    this.heraldVerb.set(rolled.verb);
  }

  applyHeraldGreeting(): void {
    this.engine.setHeraldGreeting(
      this.heraldTemplateId(),
      this.heraldAdjective(),
      this.heraldNoun(),
      this.heraldVerb(),
    );
  }

  onOpenExpeditionRift(): void {
    this.engine.openExpeditionRift(
      this.riftEra(),
      this.riftAtmosphere(),
      this.riftTheme(),
      this.riftBiome(),
    );
  }

  onEnterExpeditionRift(): void {
    this.engine.enterExpeditionRift();
  }

  onCollapseExpeditionRift(): void {
    this.engine.collapseExpeditionRift();
  }

  onCrackSphereCore(coreId: string): void {
    this.engine.crackSphereCore(coreId);
  }

  onGraftSphereCore(coreId: string): void {
    this.engine.graftSphereCore(coreId);
  }

  rollRandomRift(): void {
    const eras: ServerEraLetter[] = ['Δ', 'Θ', 'Λ', 'Σ', 'Ω'];
    const atmo =
      this.atmospherePrefixes[Math.floor(Math.random() * this.atmospherePrefixes.length)];
    const theme = this.structuralThemes[Math.floor(Math.random() * this.structuralThemes.length)];
    const biome = this.biomeNouns[Math.floor(Math.random() * this.biomeNouns.length)];
    const era = eras[Math.floor(Math.random() * eras.length)];
    this.riftEra.set(era);
    this.riftAtmosphere.set(atmo);
    this.riftTheme.set(theme);
    this.riftBiome.set(biome);
  }
}

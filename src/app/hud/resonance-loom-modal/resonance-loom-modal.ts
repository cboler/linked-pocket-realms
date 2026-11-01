import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AtmospherePrefix,
  BiomeNoun,
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
  ChaosGateService,
  SERVER_ERAS,
  STRUCTURAL_THEMES,
} from '../../core/services/chaos-gate.service';
import { MudEngineService } from '../../core/services/mud-engine.service';
import { StorageService } from '../../core/services/storage.service';
import { ThunderpassService } from '../../core/services/thunderpass.service';
import { TransportService } from '../../core/services/transport.service';

@Component({
  selector: 'app-resonance-loom-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './resonance-loom-modal.html',
  styleUrl: './resonance-loom-modal.scss',
})
export class ResonanceLoomModalComponent {
  readonly engine = inject(MudEngineService);
  readonly transport = inject(TransportService);
  readonly thunderpass = inject(ThunderpassService);
  readonly chaosGate = inject(ChaosGateService);
  readonly storage = inject(StorageService);

  readonly loomActiveTab = signal<'WEAVER' | 'WEBRTC' | 'THUNDERPASS' | 'OVERGROWTH'>('WEBRTC');
  readonly shareConfirmationMessage = signal<string>('');
  readonly exportedCartridgeText = signal<string>('');
  readonly remoteHandshakeInput = signal<string>('');
  readonly isColliding = signal<boolean>(false);

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
    this.refreshCartridgeText();
  }

  setLoomActiveTab(tab: 'WEAVER' | 'WEBRTC' | 'THUNDERPASS' | 'OVERGROWTH'): void {
    this.loomActiveTab.set(tab);
    if (tab === 'WEAVER') {
      this.refreshCartridgeText();
    } else if (tab === 'WEBRTC') {
      void this.transport.refreshBrokerSessions();
    }
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
      const addr = this.engine.activeGateAddress().formatted;
      const greeting = char.heraldGreeting?.formatted;
      const result = await this.transport.collideWithNearbyRealm(char.name, addr, greeting);
      if (result.action === 'JOINED' && result.triChord) {
        this.engine.traverseChaosGatePortal(result.triChord);
        this.engine.appendFeed(
          'NETWORK',
          `⚡ [Collision] Successfully collided with active lobby ${result.roomCode}! Traversed to ${result.triChord}.`,
        );
      } else {
        this.engine.appendFeed(
          'NETWORK',
          `⚡ [Collision] Hosted new broadcast lobby ${result.roomCode} for nearby travelers.`,
        );
      }
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

  async generateWebRtcOffer(): Promise<void> {
    await this.transport.createWebRtcOffer();
  }

  async acceptWebRtcHandshake(): Promise<void> {
    const token = this.remoteHandshakeInput();
    if (!token.trim()) return;
    await this.transport.acceptWebRtcHandshake(token);
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

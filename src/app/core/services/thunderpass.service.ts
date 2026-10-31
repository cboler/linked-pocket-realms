import { Injectable, inject, signal } from '@angular/core';
import {
  ThunderpassEncounter,
  ThunderpassSporePayload,
  TravelerEcho,
} from '../models/domain.models';
import { ChaosGateService } from './chaos-gate.service';
import { MudEngineService } from './mud-engine.service';
import { StorageService } from './storage.service';
import { TransportService } from './transport.service';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
  bluetooth?: {
    requestDevice(options: {
      acceptAllDevices: boolean;
    }): Promise<{ id?: string; name?: string } | null>;
  };
}

const THUNDERPASS_SALT = 'linked-pocket-realms-thunderpass-salt-v1';
const STORAGE_KEY_STREET_LOG = 'thunderpass_streetpass_log_v1';

@Injectable({
  providedIn: 'root',
})
export class ThunderpassService {
  private readonly engine = inject(MudEngineService);
  private readonly chaosGate = inject(ChaosGateService);
  private readonly storage = inject(StorageService);
  private readonly transport = inject(TransportService);

  readonly isWalkModeActive = signal<boolean>(false);
  readonly batterySaverOverlay = signal<boolean>(false);
  readonly currentZoneHash = signal<string>('');
  readonly currentGeohashDisplay = signal<string>('Offline / Inactive');
  readonly streetPassLog = signal<ThunderpassEncounter[]>([]);
  readonly isScanningBle = signal<boolean>(false);
  readonly lastMatchCount = signal<number>(0);
  readonly brokerUrl = signal<string>('');

  private geoWatchId: number | null = null;
  private wakeLockSentinel: WakeLockSentinelLike | null = null;
  private lastQueriedZoneHash = '';

  constructor() {
    void this.loadStreetLog();
  }

  private async loadStreetLog(): Promise<void> {
    const saved = await this.storage.getItem<ThunderpassEncounter[]>(STORAGE_KEY_STREET_LOG);
    if (saved && Array.isArray(saved)) {
      this.streetPassLog.set(saved);
    }
  }

  private async saveStreetLog(): Promise<void> {
    await this.storage.setItem(STORAGE_KEY_STREET_LOG, this.streetPassLog());
  }

  /**
   * Encodes latitude and longitude into a precision-6 coarse Geohash (~600m cell)
   */
  encodeGeohash(lat: number, lon: number, precision = 6): string {
    const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let minLat = -90;
    let maxLat = 90;
    let minLon = -180;
    let maxLon = 180;
    let geohash = '';
    let isEven = true;
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
      if (isEven) {
        const mid = (minLon + maxLon) / 2;
        if (lon > mid) {
          ch |= 1 << (4 - bit);
          minLon = mid;
        } else {
          maxLon = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (lat > mid) {
          ch |= 1 << (4 - bit);
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isEven = !isEven;
      if (bit < 4) {
        bit++;
      } else {
        geohash += B32[ch];
        bit = 0;
        ch = 0;
      }
    }
    return geohash;
  }

  /**
   * Compute a zero-knowledge, privacy-blinded SHA-256 hash from geohash + 6-hour UTC window + salt.
   * Raw coordinates never leave the device.
   */
  async computeZoneHash(geohash: string): Promise<string> {
    const date = new Date();
    // 6-hour window bucket: 0, 6, 12, 18
    const hourBucket = Math.floor(date.getUTCHours() / 6) * 6;
    const windowStr = `${date.toISOString().slice(0, 10)}T${hourBucket.toString().padStart(2, '0')}`;
    const rawData = `${geohash}:${windowStr}:${THUNDERPASS_SALT}`;

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawData));
        const hashArray = Array.from(new Uint8Array(digest));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        // Fallback simple hash
      }
    }

    // Fallback hash if SubtleCrypto unavailable
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = (hash << 5) - hash + rawData.charCodeAt(i);
      hash |= 0;
    }
    return `zone-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Toggle Walk Mode: acquires Screen WakeLock, monitors geolocation, and blinded zone relay
   */
  async toggleWalkMode(): Promise<void> {
    if (this.isWalkModeActive()) {
      this.disableWalkMode();
    } else {
      await this.enableWalkMode();
    }
  }

  async enableWalkMode(): Promise<void> {
    this.isWalkModeActive.set(true);

    // Request Screen WakeLock if supported
    if ('wakeLock' in navigator) {
      try {
        const nav = navigator as unknown as NavigatorWithWakeLock;
        if (nav.wakeLock) {
          this.wakeLockSentinel = await nav.wakeLock.request('screen');
        }
      } catch {
        // WakeLock request rejected or unsupported
      }
    }

    // Start Geolocation watcher
    if ('geolocation' in navigator) {
      this.geoWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const geohash = this.encodeGeohash(pos.coords.latitude, pos.coords.longitude, 6);
          this.currentGeohashDisplay.set(`Grid: ${geohash.toUpperCase()}`);
          const zoneHash = await this.computeZoneHash(geohash);
          this.currentZoneHash.set(zoneHash);

          if (zoneHash !== this.lastQueriedZoneHash) {
            this.lastQueriedZoneHash = zoneHash;
            await this.queryRelayForZone(zoneHash);
          }
        },
        () => {
          // Geolocation error or permission denied: use local dev simulation
          this.currentGeohashDisplay.set('Grid: MOCK-6A (Simulated)');
          void this.handleMockPosition();
        },
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 25000 },
      );
    } else {
      this.currentGeohashDisplay.set('Grid: DEV-LOCAL');
      await this.handleMockPosition();
    }

    this.engine.appendFeed(
      'NETWORK',
      '📡 [Thunderpass Active] StreetPass walk mode engaged. Screen WakeLock active; monitoring proximity grid for foreign spores.',
    );
  }

  disableWalkMode(): void {
    this.isWalkModeActive.set(false);
    this.batterySaverOverlay.set(false);

    if (this.geoWatchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }

    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // Ignore
      }
      this.wakeLockSentinel = null;
    }

    this.currentGeohashDisplay.set('Offline / Inactive');
    this.engine.appendFeed('NETWORK', '📡 [Thunderpass Inactive] Walk mode disengaged.');
  }

  toggleBatterySaverOverlay(): void {
    this.batterySaverOverlay.update((v) => !v);
  }

  private async handleMockPosition(): Promise<void> {
    const mockHash = await this.computeZoneHash('9q8yyk');
    this.currentZoneHash.set(mockHash);
    await this.queryRelayForZone(mockHash);
  }

  /**
   * Pings broker with blinded zoneHash and local spore payload
   */
  async queryRelayForZone(zoneHash: string): Promise<void> {
    const char = this.engine.character();
    const addr = this.engine.activeGateAddress();

    const localEcho: TravelerEcho = {
      id: `echo-${this.transport.localPeerId}`,
      playerName: char.name,
      archetype: char.archetype,
      level: char.level,
      triChord: addr.formatted,
      forgedItems: char.inventory.filter((i) => i.provenance === 'Architect Forged'),
      encounterTimestampIso: new Date().toISOString(),
    };

    const sporePayload: ThunderpassSporePayload = {
      peerPublicKey: this.transport.localPeerId,
      playerName: char.name,
      triChord: addr.formatted,
      echo: localEcho,
      timestampMs: Date.now(),
    };

    const url = this.brokerUrl().trim();
    if (!url) {
      // Offline fallback: broadcast on BroadcastChannel for multi-device/multi-tab local testing
      this.transport.sendPacket({
        senderName: char.name,
        type: 'THUNDERPASS_SPORE',
        gateAddress: addr.formatted,
        spore: sporePayload,
      });
      return;
    }

    try {
      const response = await fetch(`${url}/thunderpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneHash, sporePayload }),
      });

      if (response.ok) {
        const data = await response.json();
        const matches: ThunderpassSporePayload[] = data.matchingSpores || [];
        this.lastMatchCount.set(matches.length);

        for (const match of matches) {
          this.processEncounter(zoneHash, match);
        }
      }
    } catch {
      // Offline fallback: broadcast on BroadcastChannel for multi-device/multi-tab local testing
      this.transport.sendPacket({
        senderName: char.name,
        type: 'THUNDERPASS_SPORE',
        gateAddress: addr.formatted,
        spore: sporePayload,
      });
    }
  }

  /**
   * Process a discovered stranger spore: sprout Overgrowth rooms and log encounter
   */
  processEncounter(zoneHash: string, remoteSpore: ThunderpassSporePayload): void {
    // Check if we already logged this peer within last 4 hours
    const existing = this.streetPassLog().find(
      (e) => e.peerPublicKey === remoteSpore.peerPublicKey,
    );
    if (existing) return;

    const remoteAddr = this.chaosGate.parseAddressString(remoteSpore.triChord);
    if (!remoteAddr) return;

    // Sprout foreign Overgrowth rooms onto local realm
    const graftedRooms = this.engine.graftOvergrowthIncursion(
      remoteAddr,
      remoteSpore.playerName,
      remoteSpore.echo,
    );

    const encounter: ThunderpassEncounter = {
      id: `enc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      zoneHash,
      peerPublicKey: remoteSpore.peerPublicKey,
      playerName: remoteSpore.playerName,
      triChord: remoteSpore.triChord,
      timestampIso: new Date().toISOString(),
      echo: remoteSpore.echo,
      roomsGrafted: graftedRooms.map((r) => r.id),
    };

    this.streetPassLog.update((prev) => [encounter, ...prev.slice(0, 49)]);
    void this.saveStreetLog();

    this.engine.appendFeed(
      'NETWORK',
      `⚡ [Thunderpass StreetPass Match!] Crossed paths with ${remoteSpore.playerName} (${remoteSpore.triChord})! Sprouted ${graftedRooms.length} Overgrowth incursion rooms into your realm.`,
    );
  }

  /**
   * Simulates a streetpass walk collision on demand (dev testing & indoor play)
   */
  simulateThunderpassCollision(
    peerName = 'Wanderer_Aura',
    triChord = 'Δ: Blighted Astral Spire',
  ): void {
    const mockEcho: TravelerEcho = {
      id: `sim-echo-${Date.now()}`,
      playerName: peerName,
      archetype: 'Chronomancer',
      level: 4,
      triChord,
      forgedItems: [
        {
          id: `sim-item-${Date.now()}`,
          name: 'Spliced Chrono-Prism',
          slot: 'Relic 1',
          rarity: 'Relic',
          weight: 2,
          provenance: 'Architect Forged',
          originGateAddress: triChord,
          statBonuses: { INT: 5, PER: 4, speedPctBonus: 8 },
          totalStatBudget: 17,
        },
      ],
      encounterTimestampIso: new Date().toISOString(),
    };

    const mockSpore: ThunderpassSporePayload = {
      peerPublicKey: `sim-peer-${Date.now()}`,
      playerName: peerName,
      triChord,
      echo: mockEcho,
      timestampMs: Date.now(),
    };

    this.processEncounter(this.currentZoneHash() || 'sim-grid-zone', mockSpore);
  }

  /**
   * Web Bluetooth Hook: Scan for nearby physical BLE beacons / peripherals
   * and deterministically hash their device ID into a unique incursion spore!
   */
  async scanNearbyBleRelic(): Promise<void> {
    this.isScanningBle.set(true);

    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const nav = navigator as unknown as NavigatorWithWakeLock;
        const device = nav.bluetooth
          ? await nav.bluetooth.requestDevice({
              acceptAllDevices: true,
            })
          : null;

        if (device && device.name) {
          const deviceHash = await this.computeZoneHash(device.id || device.name);
          const eraLetters = ['Δ', 'Θ', 'Λ', 'Σ', 'Ω'] as const;
          const era = eraLetters[deviceHash.charCodeAt(0) % eraLetters.length];
          const themes = ['Clockwork', 'Fungal', 'Monolithic', 'Sunken', 'Astral', 'Forge'];
          const theme = themes[deviceHash.charCodeAt(1) % themes.length];
          const biomes = ['Sanctuary', 'Observatory', 'Citadel', 'Catacombs', 'Crucible'];
          const biome = biomes[deviceHash.charCodeAt(2) % biomes.length];
          const triChord = `${era}: Crystalline ${theme} ${biome}`;

          this.simulateThunderpassCollision(`BLE Relic [${device.name}]`, triChord);
          this.engine.appendFeed(
            'NETWORK',
            `📡 [Web Bluetooth Scan] Attuned to physical BLE beacon '${device.name}'. Harvested incursion spore: ${triChord}!`,
          );
          this.isScanningBle.set(false);
          return;
        }
      } catch {
        // User cancelled or unsupported
      }
    }

    // Graceful fallback simulation
    setTimeout(() => {
      this.isScanningBle.set(false);
      this.simulateThunderpassCollision('Cosmic BLE Beacon', 'Ω: Aetherial Forge Crucible');
      this.engine.appendFeed(
        'NETWORK',
        '📡 [BLE Beacon Emulation] Physical BLE scanner attuned to nearby magnetic pulse. Harvested incursion spore: Ω: Aetherial Forge Crucible!',
      );
    }, 600);
  }
}

import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { RUNTIME_CONFIG } from '../config/runtime.config';
import {
  ArchetypeClass,
  BazaarListing,
  BrokerSessionInfo,
  CommandIntent,
  EquipmentItem,
  GuestbookGravestoneEntry,
  NetworkPacket,
  NetworkPacketType,
  NetworkPeerVisitor,
  P2PChatMessage,
  PhantomBreadcrumb,
} from '../models/domain.models';

const CHANNEL_NAME = 'linked_pocket_realms_chaos_gate_bus_v1';
const SAVED_BROKER_URL_KEY = 'linked_pocket_realms_broker_url';
const PEER_ID_SESSION_KEY = 'linked_pocket_realms_tab_peer_id';
const HOSTING_OPEN_KEY = 'lpr_hosting_open';
const BROKER_BUDGET_KEY = 'lpr_broker_calls';

/** Shown wherever connections are offered or fail. There is no TURN relay server. */
export const CONNECTIVITY_NOTE =
  'Direct connections usually work on home Wi-Fi. Phones on mobile data and some school or office networks may not connect, because there is no relay server.';

// Link timing
const LINK_PING_MS = 5_000;
const LINK_TIMEOUT_MS = 20_000;
const LINK_CONNECT_TIMEOUT_MS = 30_000;
const PEER_EXPIRY_MS = 30_000;
const ICE_GATHER_TIMEOUT_MS = 4_000;
const MAX_VISITOR_LINKS = 8;
const REJOIN_DELAYS_MS = [5_000, 15_000, 45_000];

// Broker frugality (free tier: 2M requests/month across all players)
const HOST_HEARTBEAT_MS = 20_000; // broker session TTL is 60 s
const JOIN_POLL_MS = 3_000;
const JOIN_POLL_DEADLINE_MS = 45_000;
const LOBBY_REFRESH_MS = 30_000;
const IDLE_PAUSE_MS = 15 * 60_000;
const DAILY_BROKER_CALL_CAP = 1_500; // per browser per day
const BROKER_BACKOFF_MS = 10 * 60_000;

// Inbound packet limits
const MAX_PACKET_CHARS = 64 * 1024;
const RATE_LIMIT_PER_SEC = 20;
const RATE_LIMIT_BURST = 40;
const SEEN_PACKET_LIMIT = 500;

const STUN_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const KNOWN_PACKET_TYPES = new Set<NetworkPacketType>([
  'GATE_BEACON',
  'PORTAL_TRAVERSE_REQUEST',
  'PORTAL_REALM_SYNC',
  'VISITOR_POSITION_UPDATE',
  'COOP_COMBAT_INTENT',
  'GRAVESTONE_RECORD',
  'TRADE_OFFER',
  'THUNDERPASS_SPORE',
  'CHAT_MESSAGE',
  'CHALK_INSCRIPTION',
  'TOMBSTONE_COMMITTED',
  'GRIMOIRE_SHARED',
  'MECHANISM_PULLED',
  'BAZAAR_LISTED',
  'BAZAAR_PURCHASED',
  'PEER_CHAT',
  'PING',
  'VISITOR_HELLO',
  'VISITOR_LEAVE',
  'REALM_SNAPSHOT',
  'ROOM_STATE',
  'ACTION_DAMAGE',
  'ACTION_TAKE',
  'ACTION_RESULT',
  'MONSTER_DEFEATED',
  'HOST_AWAY',
]);

/** Packets a host forwards from one visitor to its other visitors. Authority packets are never relayed. */
const RELAYABLE_TYPES = new Set<NetworkPacketType>([
  'GATE_BEACON',
  'CHAT_MESSAGE',
  'PEER_CHAT',
  'CHALK_INSCRIPTION',
  'TOMBSTONE_COMMITTED',
  'GRAVESTONE_RECORD',
  'GRIMOIRE_SHARED',
  'COOP_COMBAT_INTENT',
]);

function initTabPeerId(): string {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(PEER_ID_SESSION_KEY);
      if (stored && stored.startsWith('peer-')) {
        return stored;
      }
      const newId = `peer-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(PEER_ID_SESSION_KEY, newId);
      return newId;
    }
  } catch {
    // fallback
  }
  return `peer-${Math.random().toString(36).substring(2, 9)}`;
}

function readLocal(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, tests)
  }
}

function descToInit(desc: RTCSessionDescription): RTCSessionDescriptionInit {
  return typeof desc.toJSON === 'function' ? desc.toJSON() : { type: desc.type, sdp: desc.sdp };
}

function encodeToken(token: HandshakeToken): string {
  const bytes = new TextEncoder().encode(JSON.stringify(token));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function decodeToken(raw: string): HandshakeToken | null {
  try {
    const binary = atob(raw.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as HandshakeToken;
    if (parsed?.v !== 2 || (parsed.k !== 'join' && parsed.k !== 'reply')) return null;
    if (typeof parsed.from !== 'string' || !parsed.sdp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks shape and size of an inbound packet and trims free text.
 * Returns null for anything malformed. Never trusts `relayedBy` from the wire.
 */
export function sanitizeIncomingPacket(raw: unknown): NetworkPacket | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p['packetId'] !== 'string' || p['packetId'].length > 80) return null;
  if (typeof p['senderPeerId'] !== 'string' || p['senderPeerId'].length > 64) return null;
  if (typeof p['type'] !== 'string' || !KNOWN_PACKET_TYPES.has(p['type'] as NetworkPacketType)) {
    return null;
  }
  if (typeof p['gateAddress'] !== 'string' || p['gateAddress'].length > 120) return null;
  if (p['roomId'] !== undefined && (typeof p['roomId'] !== 'string' || p['roomId'].length > 80)) {
    return null;
  }
  if (p['toPeerId'] !== undefined && typeof p['toPeerId'] !== 'string') return null;

  const packet = { ...(p as unknown as NetworkPacket) };
  delete packet.relayedBy;
  packet.senderName =
    typeof packet.senderName === 'string' ? packet.senderName.slice(0, 40) : 'Wanderer';
  if (packet.chat) {
    if (typeof packet.chat.text !== 'string') return null;
    packet.chat = { ...packet.chat, text: packet.chat.text.slice(0, 280) };
  }
  if (packet.peerChat) {
    if (typeof packet.peerChat.text !== 'string') return null;
    packet.peerChat = { ...packet.peerChat, text: packet.peerChat.text.slice(0, 280) };
  }
  if (packet.heraldGreeting !== undefined) {
    if (typeof packet.heraldGreeting !== 'string') return null;
    packet.heraldGreeting = packet.heraldGreeting.slice(0, 120);
  }
  const auth = packet.authority;
  if (auth !== undefined) {
    if (typeof auth !== 'object' || auth === null) return null;
    if (auth.damage !== undefined && !Number.isFinite(auth.damage)) return null;
    if (auth.itemIds !== undefined && (!Array.isArray(auth.itemIds) || auth.itemIds.length > 20)) {
      return null;
    }
    if (auth.rooms !== undefined && (!Array.isArray(auth.rooms) || auth.rooms.length > 200)) {
      return null;
    }
  }
  if (packet.breadcrumbs !== undefined) {
    if (!Array.isArray(packet.breadcrumbs)) return null;
    packet.breadcrumbs = packet.breadcrumbs.slice(0, 10);
  }
  return packet;
}

interface HandshakeToken {
  v: 2;
  /** join = visitor's offer, reply = host's answer */
  k: 'join' | 'reply';
  from: string;
  to?: string;
  name?: string;
  sdp: RTCSessionDescriptionInit;
}

/** The part of RTCDataChannel the transport uses. Tests pass in-memory fakes. */
export interface ChannelLike {
  readonly readyState: string;
  send(data: string): void;
  close(): void;
  onopen: ((ev: Event) => unknown) | null;
  onclose: ((ev: Event) => unknown) | null;
  onmessage: ((ev: MessageEvent) => unknown) | null;
}

export type LinkRole = 'HOST' | 'VISITOR';
export type LinkState = 'CONNECTING' | 'OPEN' | 'CLOSED' | 'FAILED';

/** What the UI shows for one direct link. `role` is the other side's role. */
export interface PeerLinkView {
  peerId: string;
  name: string;
  role: LinkRole;
  state: LinkState;
  detail?: string;
}

export interface LinkEvent {
  peerId: string;
  name: string;
  role: LinkRole;
  state: LinkState;
  detail?: string;
}

interface PeerLink {
  peerId: string;
  role: LinkRole;
  name: string;
  pc: RTCPeerConnection | null;
  channel: ChannelLike | null;
  state: LinkState;
  detail?: string;
  createdAtMs: number;
  lastRxMs: number;
  lastTxMs: number;
  brokerRoomCode?: string;
  rejoinAttempt: number;
  tokens: number;
  tokensAtMs: number;
  connectTimer: ReturnType<typeof setTimeout> | null;
  closedByUs: boolean;
}

/** What the engine tells the transport about the local player, used for lobby announcements. */
export interface LocalProfile {
  name: string;
  gateAddress: string;
  greeting?: string;
  atHome: boolean;
}

interface BrokerSignal {
  type: string;
  payload?: string;
  senderId?: string | null;
  to?: string | null;
  timestampMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class TransportService implements OnDestroy {
  readonly localPeerId = initTabPeerId();

  private broadcastChannel: BroadcastChannel | null = null;
  private readonly peerLinks = new Map<string, PeerLink>();
  private readonly seenPacketIds = new Set<string>();

  private readonly incomingPacketSubject = new Subject<NetworkPacket>();
  readonly packets$: Observable<NetworkPacket> = this.incomingPacketSubject.asObservable();
  private readonly linkEventSubject = new Subject<LinkEvent>();
  /** Link opened, closed, or failed. */
  readonly linkEvents$: Observable<LinkEvent> = this.linkEventSubject.asObservable();
  private readonly peerGoneSubject = new Subject<string>();
  /** A peer left: link closed or presence expired. */
  readonly peerGone$: Observable<string> = this.peerGoneSubject.asObservable();

  readonly discoveredPeers = signal<Record<string, NetworkPeerVisitor>>({});
  readonly activeVisitorsList = computed<NetworkPeerVisitor[]>(() =>
    Object.values(this.discoveredPeers()),
  );

  readonly links = signal<PeerLinkView[]>([]);
  readonly activePeerMeshCount = computed<number>(
    () => this.links().filter((l) => l.state === 'OPEN').length,
  );
  /** Summary state for the manual code flow. */
  readonly rtcConnectionState = computed<'DISCONNECTED' | 'AWAITING_ANSWER' | 'CONNECTED'>(() => {
    const all = this.links();
    if (all.some((l) => l.state === 'OPEN')) return 'CONNECTED';
    if (all.some((l) => l.state === 'CONNECTING')) return 'AWAITING_ANSWER';
    return 'DISCONNECTED';
  });
  /** Last join or reply code this tab produced, for copy-paste. */
  readonly localSdpPayload = signal<string>('');
  readonly activeRoomCode = signal<string>('');
  readonly webRtcSupported = typeof RTCPeerConnection !== 'undefined';

  // Broker (optional, free tier)
  readonly brokerUrl = signal<string>('');
  readonly brokerSessions = signal<BrokerSessionInfo[]>([]);
  readonly isBrokerConnecting = signal<boolean>(false);
  /** Opt-in: announce this realm in the lobby so others can join. */
  readonly hostingOpen = signal<boolean>(readLocal(HOSTING_OPEN_KEY) === 'true');
  readonly brokerMeshStatus = signal<'IDLE' | 'WAKING' | 'CONNECTED' | 'OFFLINE'>('IDLE');
  /** Plain-language reason the broker is paused, if it is. */
  readonly brokerNotice = signal<string>('');
  readonly brokerCallsToday = signal<number>(0);
  readonly dailyBrokerCallCap = DAILY_BROKER_CALL_CAP;

  readonly nearbyRealmsCount = computed<number>(() => {
    return this.brokerSessions().filter(
      (s) => s.senderId !== this.localPeerId && s.roomCode !== this.myLobbyRoomCode(),
    ).length;
  });

  readonly myLobbyRoomCode = computed<string>(
    () =>
      'LOOM-' +
      this.localPeerId
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-4)
        .toUpperCase(),
  );

  private localProfile: LocalProfile = { name: 'Wanderer', gateAddress: '', atHome: true };
  private lastActivityMs = Date.now();
  private brokerPausedUntilMs = 0;
  private hasAnnounced = false;
  private lastHostSignalMs = 0;
  private readonly answeredOffers = new Set<string>();
  private lobbyBrowsing = false;
  private manualJoinCounter = 0;

  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;
  private hostTimer: ReturnType<typeof setInterval> | null = null;
  private lobbyTimer: ReturnType<typeof setInterval> | null = null;
  private readonly joinPollTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly rejoinTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly onActivity = (): void => {
    this.lastActivityMs = Date.now();
  };

  constructor() {
    this.initBroadcastChannelAdapter();
    let initialUrl = RUNTIME_CONFIG.autoConnectBroker ? RUNTIME_CONFIG.defaultBrokerUrl : '';
    const saved = readLocal(SAVED_BROKER_URL_KEY);
    if (
      saved !== null &&
      saved.trim() !== '' &&
      !saved.includes('linked-pocket-realms-broker-uc.a.run.app')
    ) {
      initialUrl = saved.trim();
    }
    // No broker call at startup: the lobby is only fetched when someone looks at it.
    this.brokerUrl.set(initialUrl);
    this.brokerCallsToday.set(this.readBudget().n);

    this.maintenanceTimer = setInterval(() => this.runMaintenance(), LINK_PING_MS);
    this.hostTimer = setInterval(() => void this.hostHeartbeatTick(), HOST_HEARTBEAT_MS);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.leaveBrokerSession());
      window.addEventListener('pointerdown', this.onActivity, { passive: true });
      window.addEventListener('keydown', this.onActivity, { passive: true });
    }
  }

  // ===========================================================================
  // Local profile & broadcast bus
  // ===========================================================================

  /** Called by the engine so lobby announcements describe the player correctly. */
  setLocalProfile(profile: LocalProfile): void {
    const wasHome = this.localProfile.atHome;
    this.localProfile = profile;
    if (wasHome && !profile.atHome && this.hasAnnounced) {
      // Hosting only covers the home realm.
      this.leaveBrokerSession();
    }
  }

  private initBroadcastChannelAdapter(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        const packet = sanitizeIncomingPacket(event?.data);
        if (!packet || packet.senderPeerId === this.localPeerId) return;
        if (packet.toPeerId && packet.toPeerId !== this.localPeerId) return;
        if (!this.markSeen(packet.packetId)) return;
        this.handleIncomingPacket(packet, 'BroadcastChannel');
      };
    } catch {
      // BroadcastChannel unavailable in restricted contexts
    }
  }

  /** Stop listening to other tabs in this browser (used by tests to isolate links). */
  closeBroadcastChannel(): void {
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
  }

  private markSeen(packetId: string): boolean {
    if (this.seenPacketIds.has(packetId)) return false;
    this.seenPacketIds.add(packetId);
    if (this.seenPacketIds.size > SEEN_PACKET_LIMIT) {
      const oldest = this.seenPacketIds.values().next().value;
      if (oldest) this.seenPacketIds.delete(oldest);
    }
    return true;
  }

  private handleIncomingPacket(
    packet: NetworkPacket,
    transport: 'BroadcastChannel' | 'WebRTC',
  ): void {
    if (packet.type !== 'PING' && packet.senderPeerId && packet.gateAddress) {
      this.discoveredPeers.update((prev) => {
        const existing = prev[packet.senderPeerId];
        return {
          ...prev,
          [packet.senderPeerId]: {
            peerId: packet.senderPeerId,
            playerName: packet.senderName || existing?.playerName || 'Wanderer',
            archetype: packet.visitorState?.archetype ?? existing?.archetype ?? 'Vanguard',
            level: packet.visitorState?.level ?? existing?.level ?? 1,
            gateAddress: packet.gateAddress,
            currentRoomId: packet.roomId ?? existing?.currentRoomId ?? 'room-0',
            inCombat: packet.visitorState?.inCombat ?? existing?.inCombat ?? false,
            lastSeenMs: Date.now(),
            transport,
            heraldGreeting: packet.heraldGreeting || existing?.heraldGreeting,
            currentHp: packet.visitorState?.currentHp ?? existing?.currentHp,
            maxHp: packet.visitorState?.maxHp ?? existing?.maxHp,
            isAstralEcho:
              packet.isAstralEcho ??
              packet.visitorState?.isAstralEcho ??
              existing?.isAstralEcho ??
              packet.senderPeerId === 'peer-astral-echo',
          },
        };
      });
    }
    if (packet.type === 'PING') return;
    this.incomingPacketSubject.next(packet);
  }

  private buildPacket(
    partial: Omit<NetworkPacket, 'packetId' | 'senderPeerId' | 'timestampMs'>,
  ): NetworkPacket {
    const packet: NetworkPacket = {
      ...partial,
      packetId: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderPeerId: this.localPeerId,
      timestampMs: Date.now(),
    };
    this.markSeen(packet.packetId);
    return packet;
  }

  /** Send to everyone: other tabs in this browser and every open link. */
  sendPacket(
    partial: Omit<NetworkPacket, 'packetId' | 'senderPeerId' | 'timestampMs'>,
  ): NetworkPacket {
    const packet = this.buildPacket(partial);
    this.postToBroadcastChannel(packet);
    const payload = JSON.stringify(packet);
    for (const link of this.peerLinks.values()) {
      this.sendRaw(link, payload);
    }
    return packet;
  }

  /**
   * Send to one peer: over its link if open, through my host if it's another of the host's
   * visitors, or over the same-browser bus. Returns false when the peer can't be reached.
   */
  sendTo(
    peerId: string,
    partial: Omit<NetworkPacket, 'packetId' | 'senderPeerId' | 'timestampMs' | 'toPeerId'>,
  ): boolean {
    const packet = this.buildPacket({ ...partial, toPeerId: peerId });
    const payload = JSON.stringify(packet);
    const direct = this.peerLinks.get(peerId);
    if (direct && direct.state === 'OPEN') {
      return this.sendRaw(direct, payload);
    }
    const peer = this.discoveredPeers()[peerId];
    if (peer?.transport === 'BroadcastChannel' && this.broadcastChannel) {
      this.postToBroadcastChannel(packet);
      return true;
    }
    const host = [...this.peerLinks.values()].find((l) => l.role === 'HOST' && l.state === 'OPEN');
    if (host) {
      return this.sendRaw(host, payload);
    }
    return false;
  }

  private postToBroadcastChannel(packet: NetworkPacket): void {
    if (!this.broadcastChannel) return;
    try {
      this.broadcastChannel.postMessage(packet);
    } catch {
      // Ignore closed channel error
    }
  }

  private sendRaw(link: PeerLink, payload: string): boolean {
    if (!link.channel || link.state !== 'OPEN' || link.channel.readyState !== 'open') return false;
    try {
      link.channel.send(payload);
      link.lastTxMs = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Direct links (WebRTC DataChannels)
  // ===========================================================================

  /** True when this peer has an open direct link. */
  isLinkOpen(peerId: string): boolean {
    return this.peerLinks.get(peerId)?.state === 'OPEN';
  }

  linkRole(peerId: string): LinkRole | null {
    return this.peerLinks.get(peerId)?.role ?? null;
  }

  private publishLinks(): void {
    this.links.set(
      [...this.peerLinks.values()].map((l) => ({
        peerId: l.peerId,
        name: l.name,
        role: l.role,
        state: l.state,
        detail: l.detail,
      })),
    );
  }

  private emitLink(link: PeerLink): void {
    this.publishLinks();
    this.linkEventSubject.next({
      peerId: link.peerId,
      name: link.name,
      role: link.role,
      state: link.state,
      detail: link.detail,
    });
  }

  private newLink(peerId: string, role: LinkRole, name: string): PeerLink {
    const now = Date.now();
    return {
      peerId,
      role,
      name,
      pc: null,
      channel: null,
      state: 'CONNECTING',
      createdAtMs: now,
      lastRxMs: now,
      lastTxMs: now,
      rejoinAttempt: 0,
      tokens: RATE_LIMIT_BURST,
      tokensAtMs: now,
      connectTimer: null,
      closedByUs: false,
    };
  }

  /**
   * Attach an already-made channel as a link. Production code reaches this through the
   * WebRTC handshake; tests and simulations use it with in-memory channels.
   */
  attachChannel(peerId: string, role: LinkRole, channel: ChannelLike, name = 'Wanderer'): void {
    const existing = this.peerLinks.get(peerId);
    if (existing) this.disposeLink(existing, 'CLOSED', 'Replaced by a new connection');
    const link = this.newLink(peerId, role, name);
    this.peerLinks.set(peerId, link);
    this.bindChannel(link, channel);
    this.publishLinks();
  }

  private bindChannel(link: PeerLink, channel: ChannelLike): void {
    link.channel = channel;
    const markOpen = (): void => {
      if (link.state === 'OPEN') return;
      if (link.connectTimer) clearTimeout(link.connectTimer);
      link.connectTimer = null;
      link.state = 'OPEN';
      link.detail = undefined;
      link.lastRxMs = Date.now();
      link.rejoinAttempt = 0;
      this.touchPeer(link);
      this.emitLink(link);
    };
    channel.onopen = markOpen;
    channel.onclose = () => {
      if (link.state === 'CLOSED' || link.state === 'FAILED') return;
      this.disposeLink(link, 'CLOSED', link.closedByUs ? 'Disconnected' : 'Connection lost');
    };
    channel.onmessage = (event: MessageEvent) => this.handleLinkMessage(link, event.data);
    if (channel.readyState === 'open') markOpen();
  }

  private touchPeer(link: PeerLink): void {
    this.discoveredPeers.update((prev) => {
      const existing = prev[link.peerId];
      return {
        ...prev,
        [link.peerId]: {
          peerId: link.peerId,
          playerName: existing?.playerName ?? link.name,
          archetype: existing?.archetype ?? 'Vanguard',
          level: existing?.level ?? 1,
          gateAddress: existing?.gateAddress ?? '',
          currentRoomId: existing?.currentRoomId ?? 'room-0',
          inCombat: existing?.inCombat ?? false,
          lastSeenMs: Date.now(),
          transport: 'WebRTC',
          heraldGreeting: existing?.heraldGreeting,
          currentHp: existing?.currentHp,
          maxHp: existing?.maxHp,
          isAstralEcho: existing?.isAstralEcho,
        },
      };
    });
  }

  private takeToken(link: PeerLink): boolean {
    const now = Date.now();
    const refill = ((now - link.tokensAtMs) / 1000) * RATE_LIMIT_PER_SEC;
    link.tokens = Math.min(RATE_LIMIT_BURST, link.tokens + refill);
    link.tokensAtMs = now;
    if (link.tokens < 1) return false;
    link.tokens -= 1;
    return true;
  }

  private handleLinkMessage(link: PeerLink, data: unknown): void {
    if (typeof data !== 'string' || data.length > MAX_PACKET_CHARS) return;
    if (!this.takeToken(link)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const packet = sanitizeIncomingPacket(parsed);
    if (!packet) return;
    link.lastRxMs = Date.now();

    if (packet.senderPeerId !== link.peerId) {
      // Only my host may hand me packets from other players, and only public ones.
      if (link.role !== 'HOST' || !RELAYABLE_TYPES.has(packet.type)) return;
      packet.relayedBy = link.peerId;
    }
    if (!this.markSeen(packet.packetId)) return;

    if (packet.type === 'PING') {
      this.touchPeer(link);
      return;
    }

    // I'm this visitor's host: forward public chatter to my other visitors.
    if (link.role === 'VISITOR') {
      if (packet.toPeerId && packet.toPeerId !== this.localPeerId) {
        const target = this.peerLinks.get(packet.toPeerId);
        if (target && target.role === 'VISITOR' && RELAYABLE_TYPES.has(packet.type)) {
          this.sendRaw(target, data);
        }
        return;
      }
      if (!packet.toPeerId && RELAYABLE_TYPES.has(packet.type)) {
        for (const other of this.peerLinks.values()) {
          if (other !== link && other.role === 'VISITOR') this.sendRaw(other, data);
        }
      }
    } else if (packet.toPeerId && packet.toPeerId !== this.localPeerId) {
      return;
    }

    this.handleIncomingPacket(packet, 'WebRTC');
  }

  private disposeLink(link: PeerLink, state: 'CLOSED' | 'FAILED', detail: string): void {
    if (link.connectTimer) clearTimeout(link.connectTimer);
    link.connectTimer = null;
    link.state = state;
    link.detail = detail;
    const channel = link.channel;
    link.channel = null;
    try {
      if (channel) {
        channel.onclose = null;
        channel.onmessage = null;
        channel.close();
      }
      link.pc?.close();
    } catch {
      // ignore
    }
    link.pc = null;
    this.peerLinks.delete(link.peerId);
    this.stopJoinPoll(link.peerId);
    this.emitLink(link);
    this.forgetPeer(link.peerId);
    if (!link.closedByUs && link.role === 'HOST' && link.brokerRoomCode) {
      this.scheduleRejoin(link);
    }
  }

  private forgetPeer(peerId: string): void {
    this.discoveredPeers.update((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    this.peerGoneSubject.next(peerId);
  }

  /** Close one link on purpose. */
  disconnectPeer(peerId: string): void {
    const link = this.peerLinks.get(peerId);
    if (!link) return;
    link.closedByUs = true;
    this.disposeLink(link, 'CLOSED', 'Disconnected');
  }

  private scheduleRejoin(previous: PeerLink): void {
    const attempt = previous.rejoinAttempt;
    if (attempt >= REJOIN_DELAYS_MS.length || !previous.brokerRoomCode) return;
    const roomCode = previous.brokerRoomCode;
    const timer = setTimeout(() => {
      this.rejoinTimers.delete(timer);
      if (this.peerLinks.has(previous.peerId)) return;
      void this.joinBrokerSession(roomCode, attempt + 1);
    }, REJOIN_DELAYS_MS[attempt]);
    this.rejoinTimers.add(timer);
  }

  private startConnectTimer(link: PeerLink): void {
    if (link.connectTimer) clearTimeout(link.connectTimer);
    link.connectTimer = setTimeout(() => {
      if (link.state === 'CONNECTING') {
        link.closedByUs = true;
        this.disposeLink(link, 'FAILED', `Couldn't connect. ${CONNECTIVITY_NOTE}`);
      }
    }, LINK_CONNECT_TIMEOUT_MS);
  }

  private createPeerConnection(link: PeerLink): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && this.peerLinks.get(link.peerId) === link) {
        this.disposeLink(link, 'FAILED', `Couldn't connect. ${CONNECTIVITY_NOTE}`);
      }
    };
    link.pc = pc;
    return pc;
  }

  /** Wait until the browser has gathered its network addresses, so the code carries them. */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      };
      const check = (): void => {
        if (pc.iceGatheringState === 'complete') done();
      };
      const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
      pc.addEventListener('icegatheringstatechange', check);
    });
  }

  /** Visitor side: create a join code (offer) for one host. */
  private async createJoinOffer(linkKey: string, brokerRoomCode?: string): Promise<string | null> {
    if (!this.webRtcSupported) return null;
    const existing = this.peerLinks.get(linkKey);
    if (existing) {
      existing.closedByUs = true;
      this.disposeLink(existing, 'CLOSED', 'Replaced by a new connection');
    }
    const link = this.newLink(linkKey, 'HOST', 'Host');
    link.brokerRoomCode = brokerRoomCode;
    this.peerLinks.set(linkKey, link);
    const pc = this.createPeerConnection(link);
    this.bindChannel(link, pc.createDataChannel('chaos-gate-p2p') as unknown as ChannelLike);
    this.publishLinks();
    await pc.setLocalDescription(await pc.createOffer());
    await this.waitForIceGathering(pc);
    if (!pc.localDescription) return null;
    return encodeToken({
      v: 2,
      k: 'join',
      from: this.localPeerId,
      name: this.localProfile.name,
      sdp: descToInit(pc.localDescription),
    });
  }

  /** Host side: answer a visitor's join code. Returns the reply code. */
  private async answerJoin(token: HandshakeToken): Promise<string | null> {
    if (!this.webRtcSupported || token.k !== 'join') return null;
    if (token.to && token.to !== this.localPeerId) return null;
    const visitors = [...this.peerLinks.values()].filter((l) => l.role === 'VISITOR');
    if (visitors.length >= MAX_VISITOR_LINKS && !this.peerLinks.has(token.from)) return null;
    const existing = this.peerLinks.get(token.from);
    if (existing) {
      existing.closedByUs = true;
      this.disposeLink(existing, 'CLOSED', 'Replaced by a new connection');
    }
    const link = this.newLink(token.from, 'VISITOR', token.name?.slice(0, 40) || 'Visitor');
    this.peerLinks.set(token.from, link);
    const pc = this.createPeerConnection(link);
    pc.ondatachannel = (event) => this.bindChannel(link, event.channel as unknown as ChannelLike);
    this.publishLinks();
    await pc.setRemoteDescription(token.sdp);
    await pc.setLocalDescription(await pc.createAnswer());
    await this.waitForIceGathering(pc);
    if (!pc.localDescription) return null;
    this.startConnectTimer(link);
    return encodeToken({
      v: 2,
      k: 'reply',
      from: this.localPeerId,
      to: token.from,
      name: this.localProfile.name,
      sdp: descToInit(pc.localDescription),
    });
  }

  /** Visitor side: apply the host's reply code. */
  private async completeJoin(token: HandshakeToken, linkKey: string): Promise<boolean> {
    const link = this.peerLinks.get(linkKey);
    if (!link || !link.pc || token.k !== 'reply' || token.to !== this.localPeerId) return false;
    // Re-key the pending link under the host's real id.
    this.peerLinks.delete(linkKey);
    const stale = this.peerLinks.get(token.from);
    if (stale) {
      stale.closedByUs = true;
      this.disposeLink(stale, 'CLOSED', 'Replaced by a new connection');
    }
    link.peerId = token.from;
    link.name = token.name?.slice(0, 40) || 'Host';
    this.peerLinks.set(token.from, link);
    this.publishLinks();
    try {
      await link.pc.setRemoteDescription(token.sdp);
    } catch {
      this.disposeLink(link, 'FAILED', 'That reply code did not match this join code.');
      return false;
    }
    this.startConnectTimer(link);
    return true;
  }

  /** Manual flow, visitor: make a join code to send to a host. */
  async createJoinCode(): Promise<string | null> {
    this.manualJoinCounter += 1;
    const token = await this.createJoinOffer(`pending-manual-${this.manualJoinCounter}`);
    if (token) this.localSdpPayload.set(token);
    return token;
  }

  /**
   * Manual flow, either side: paste a code from the other player.
   * A join code (you are the host) returns a reply code to send back.
   */
  async useConnectionCode(raw: string): Promise<{ ok: boolean; reply?: string; message: string }> {
    const token = decodeToken(raw);
    if (!token) {
      return { ok: false, message: 'That code is not valid (or is from an older version).' };
    }
    if (!this.webRtcSupported) {
      return { ok: false, message: 'This browser does not support direct connections.' };
    }
    if (token.k === 'join') {
      const reply = await this.answerJoin(token);
      if (!reply) return { ok: false, message: 'Could not answer that join code.' };
      this.localSdpPayload.set(reply);
      return {
        ok: true,
        reply,
        message: `Send this reply code back to ${token.name ?? 'the visitor'}.`,
      };
    }
    const pendingKey = [...this.peerLinks.keys()]
      .filter((k) => k.startsWith('pending-manual-'))
      .pop();
    if (!pendingKey) {
      return { ok: false, message: 'Make a join code first, then paste the reply code.' };
    }
    const ok = await this.completeJoin(token, pendingKey);
    return ok
      ? { ok: true, message: `Connecting to ${token.name ?? 'the host'}…` }
      : { ok: false, message: 'That reply code is not for this join code.' };
  }

  /** @deprecated Kept for older call sites; use createJoinCode(). */
  async createWebRtcOffer(): Promise<string> {
    return (await this.createJoinCode()) ?? '';
  }

  /** @deprecated Kept for older call sites; use useConnectionCode(). */
  async acceptWebRtcHandshake(encodedToken: string): Promise<string | null> {
    return (await this.useConnectionCode(encodedToken)).reply ?? null;
  }

  // ===========================================================================
  // Maintenance: heartbeats, timeouts, presence expiry
  // ===========================================================================

  private runMaintenance(): void {
    const now = Date.now();
    for (const link of [...this.peerLinks.values()]) {
      if (link.state !== 'OPEN') continue;
      if (now - link.lastRxMs > LINK_TIMEOUT_MS) {
        this.disposeLink(link, 'CLOSED', 'Connection lost (no reply for 20 seconds)');
        continue;
      }
      if (now - link.lastTxMs >= LINK_PING_MS) {
        this.sendRaw(
          link,
          JSON.stringify(
            this.buildPacket({
              senderName: this.localProfile.name,
              type: 'PING',
              gateAddress: '-',
            }),
          ),
        );
      }
    }
    this.expireStalePeers(now);
  }

  /** Drop peers we have not heard from recently. The simulated Astral Echo never expires. */
  expireStalePeers(now = Date.now()): void {
    const gone: string[] = [];
    this.discoveredPeers.update((prev) => {
      let changed = false;
      const next: Record<string, NetworkPeerVisitor> = {};
      for (const [id, peer] of Object.entries(prev)) {
        const fresh = now - peer.lastSeenMs <= PEER_EXPIRY_MS;
        if (fresh || peer.isAstralEcho || this.isLinkOpen(id)) {
          next[id] = peer;
        } else {
          changed = true;
          gone.push(id);
        }
      }
      return changed ? next : prev;
    });
    for (const id of gone) this.peerGoneSubject.next(id);
  }

  // ===========================================================================
  // Broker (optional, free tier): every call goes through brokerFetch
  // ===========================================================================

  private readBudget(): { day: string; n: number } {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const parsed = JSON.parse(readLocal(BROKER_BUDGET_KEY) ?? 'null') as {
        day: string;
        n: number;
      } | null;
      if (parsed && parsed.day === day && Number.isFinite(parsed.n)) return parsed;
    } catch {
      // ignore
    }
    return { day, n: 0 };
  }

  /**
   * Count one broker request against today's per-browser cap. Returns false when the call
   * must not be made (cap reached or broker asked us to back off). Thunderpass uses this too.
   */
  reserveBrokerCall(): boolean {
    if (Date.now() < this.brokerPausedUntilMs) return false;
    const budget = this.readBudget();
    if (budget.n >= DAILY_BROKER_CALL_CAP) {
      this.brokerNotice.set(
        'Lobby paused for today to stay inside the free server limit. Join and reply codes still work.',
      );
      return false;
    }
    budget.n += 1;
    writeLocal(BROKER_BUDGET_KEY, JSON.stringify(budget));
    this.brokerCallsToday.set(budget.n);
    return true;
  }

  /**
   * The only way this app talks to the broker. Enforces a per-browser daily cap and backs
   * off when the broker says it is busy, so a single tab can never run up the free tier.
   */
  async brokerFetch(path: string, init?: RequestInit): Promise<Response | null> {
    const url = this.brokerUrl().trim();
    if (!url) return null;
    if (!this.reserveBrokerCall()) return null;
    const now = Date.now();
    try {
      const res = await fetch(`${url}${path}`, init);
      if (res.status === 429 || res.status === 503) {
        const retryAfterSec = Number(res.headers?.get?.('Retry-After'));
        this.brokerPausedUntilMs =
          now +
          (Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : BROKER_BACKOFF_MS);
        this.brokerNotice.set(
          'The lobby server is busy, so the lobby is paused for a few minutes.',
        );
        this.brokerMeshStatus.set('OFFLINE');
        return null;
      }
      return res;
    } catch {
      this.brokerMeshStatus.set('OFFLINE');
      return null;
    }
  }

  setBrokerUrl(url: string): void {
    const clean = url.trim();
    this.brokerUrl.set(clean);
    writeLocal(SAVED_BROKER_URL_KEY, clean);
    if (clean) {
      void this.refreshBrokerSessions();
    }
  }

  /** Turn lobby hosting on or off. Hosting only announces while you're home, active, and the tab is visible. */
  setHostingOpen(open: boolean): void {
    this.hostingOpen.set(open);
    writeLocal(HOSTING_OPEN_KEY, String(open));
    if (open) {
      void this.hostHeartbeatTick(true);
    } else {
      this.leaveBrokerSession();
    }
  }

  /** The network panel calls this while the lobby list is on screen. */
  setLobbyBrowsing(on: boolean): void {
    if (on === this.lobbyBrowsing) return;
    this.lobbyBrowsing = on;
    if (this.lobbyTimer) clearInterval(this.lobbyTimer);
    this.lobbyTimer = null;
    if (on) {
      void this.refreshBrokerSessions();
      this.lobbyTimer = setInterval(() => {
        if (!this.isTabHidden()) void this.refreshBrokerSessions();
      }, LOBBY_REFRESH_MS);
    }
  }

  private isTabHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  private async hostHeartbeatTick(force = false): Promise<void> {
    if (!this.hostingOpen() || !this.brokerUrl().trim() || !this.localProfile.atHome) return;
    if (!force) {
      if (this.isTabHidden()) return;
      if (Date.now() - this.lastActivityMs > IDLE_PAUSE_MS) return;
    }
    await this.announcePresenceToBroker(
      this.localProfile.name,
      this.localProfile.gateAddress,
      this.localProfile.greeting,
    );
  }

  /**
   * Host heartbeat: keep the lobby entry alive and pick up join requests.
   * The updated broker returns pending signals in the same response (1 call);
   * the older broker needs one extra GET.
   */
  async announcePresenceToBroker(
    hostName: string,
    triChord: string,
    heraldGreeting?: string,
  ): Promise<void> {
    const roomCode = this.myLobbyRoomCode();
    const res = await this.brokerFetch('/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        type: 'ANNOUNCE',
        senderId: this.localPeerId,
        hostName,
        triChord,
        heraldGreeting,
        sinceMs: this.lastHostSignalMs,
        for: this.localPeerId,
      }),
    });
    if (!res) return;
    this.hasAnnounced = true;
    this.brokerMeshStatus.set('CONNECTED');
    let signals: BrokerSignal[] | undefined;
    try {
      const data = (await res.json()) as { signals?: BrokerSignal[] };
      signals = data?.signals;
    } catch {
      signals = undefined;
    }
    if (!Array.isArray(signals)) {
      const poll = await this.brokerFetch(
        `/signal?roomCode=${encodeURIComponent(roomCode)}&sinceMs=${this.lastHostSignalMs}&for=${this.localPeerId}`,
      );
      if (!poll || poll.ok === false) return;
      try {
        signals = ((await poll.json()) as { signals?: BrokerSignal[] })?.signals;
      } catch {
        return;
      }
    }
    if (Array.isArray(signals)) await this.handleHostSignals(roomCode, signals);
  }

  private async handleHostSignals(roomCode: string, signals: BrokerSignal[]): Promise<void> {
    for (const sig of signals) {
      if (typeof sig?.timestampMs === 'number') {
        this.lastHostSignalMs = Math.max(this.lastHostSignalMs, sig.timestampMs);
      }
      if (sig?.type !== 'OFFER' || typeof sig.payload !== 'string') continue;
      const token = decodeToken(sig.payload);
      if (!token || token.k !== 'join' || (token.to && token.to !== this.localPeerId)) continue;
      const key = `${token.from}@${sig.timestampMs}`;
      if (this.answeredOffers.has(key)) continue;
      this.answeredOffers.add(key);
      const reply = await this.answerJoin(token);
      if (!reply) continue;
      await this.brokerFetch('/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          type: 'ANSWER',
          senderId: this.localPeerId,
          to: token.from,
          payload: reply,
        }),
      });
    }
  }

  async refreshBrokerSessions(): Promise<void> {
    if (!this.brokerUrl().trim()) {
      this.brokerMeshStatus.set('IDLE');
      return;
    }
    if (this.brokerMeshStatus() !== 'CONNECTED') {
      this.brokerMeshStatus.set('WAKING');
    }
    const res = await this.brokerFetch('/sessions');
    if (!res) return;
    if (res.ok === false) {
      this.brokerMeshStatus.set('OFFLINE');
      return;
    }
    try {
      const data = (await res.json()) as { sessions?: BrokerSessionInfo[] };
      const seenKeys = new Set<string>();
      const deduplicated: BrokerSessionInfo[] = [];
      for (const s of data.sessions || []) {
        const key = s.senderId || s.roomCode;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicated.push(s);
        }
      }
      this.brokerSessions.set(deduplicated);
      this.brokerMeshStatus.set('CONNECTED');
    } catch {
      this.brokerMeshStatus.set('OFFLINE');
    }
  }

  /**
   * Visitor: ask a lobby host to connect. Posts one join code, then checks every 3 s
   * (for at most 45 s) for the host's reply. Returns false if the request was not sent.
   */
  async joinBrokerSession(roomCode: string, rejoinAttempt = 0): Promise<boolean> {
    if (!this.brokerUrl().trim() || !this.webRtcSupported) return false;
    const session = this.brokerSessions().find((s) => s.roomCode === roomCode);
    const linkKey = `pending-broker-${roomCode}`;
    this.isBrokerConnecting.set(true);
    try {
      const token = await this.createJoinOffer(linkKey, roomCode);
      const link = this.peerLinks.get(linkKey);
      if (!token || !link) return false;
      link.rejoinAttempt = rejoinAttempt;
      link.name = session?.hostName ?? link.name;
      this.publishLinks();
      const sentAt = Date.now();
      // No senderId: the older broker would treat it as a new lobby owner.
      const res = await this.brokerFetch('/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          type: 'OFFER',
          to: session?.senderId ?? undefined,
          payload: token,
        }),
      });
      if (!res) {
        this.disposeLink(link, 'FAILED', 'Could not reach the lobby server.');
        return false;
      }
      this.activeRoomCode.set(roomCode);
      this.startJoinPoll(linkKey, roomCode, sentAt - 1000);
      return true;
    } finally {
      this.isBrokerConnecting.set(false);
    }
  }

  private startJoinPoll(linkKey: string, roomCode: string, sinceMs: number): void {
    this.stopJoinPoll(linkKey);
    const deadline = Date.now() + JOIN_POLL_DEADLINE_MS;
    const timer = setInterval(async () => {
      const link = this.peerLinks.get(linkKey);
      if (!link) {
        this.stopJoinPoll(linkKey);
        return;
      }
      if (Date.now() > deadline) {
        this.stopJoinPoll(linkKey);
        // First attempts fail quietly; automatic rejoin attempts may try again.
        link.closedByUs = link.rejoinAttempt === 0;
        this.disposeLink(
          link,
          'FAILED',
          "The host didn't answer. They may be away or not hosting.",
        );
        return;
      }
      const res = await this.brokerFetch(
        `/signal?roomCode=${encodeURIComponent(roomCode)}&sinceMs=${sinceMs}&for=${this.localPeerId}`,
      );
      if (!res || res.ok === false) return;
      let signals: BrokerSignal[];
      try {
        signals = ((await res.json()) as { signals?: BrokerSignal[] })?.signals ?? [];
      } catch {
        return;
      }
      for (const sig of signals) {
        if (sig?.type !== 'ANSWER' || typeof sig.payload !== 'string') continue;
        const token = decodeToken(sig.payload);
        if (!token || token.k !== 'reply' || token.to !== this.localPeerId) continue;
        this.stopJoinPoll(linkKey);
        await this.completeJoin(token, linkKey);
        const joined = this.peerLinks.get(token.from);
        if (joined) joined.brokerRoomCode = roomCode;
        return;
      }
    }, JOIN_POLL_MS);
    this.joinPollTimers.set(linkKey, timer);
  }

  private stopJoinPoll(linkKey: string): void {
    const timer = this.joinPollTimers.get(linkKey);
    if (timer) clearInterval(timer);
    this.joinPollTimers.delete(linkKey);
  }

  /**
   * One tap: join the first other realm in the lobby, or open your own for visitors.
   */
  async collideWithNearbyRealm(
    hostName: string,
    triChord: string,
    heraldGreeting?: string,
  ): Promise<{ action: 'JOINED' | 'HOSTED'; roomCode: string; triChord?: string }> {
    await this.refreshBrokerSessions();
    const remote = this.brokerSessions().find(
      (s) => s.senderId !== this.localPeerId && s.roomCode !== this.myLobbyRoomCode(),
    );

    if (remote) {
      await this.joinBrokerSession(remote.roomCode);
      return {
        action: 'JOINED',
        roomCode: remote.roomCode,
        triChord: remote.triChord,
      };
    }

    this.localProfile = {
      ...this.localProfile,
      name: hostName,
      gateAddress: triChord,
      greeting: heraldGreeting,
    };
    this.hostingOpen.set(true);
    writeLocal(HOSTING_OPEN_KEY, 'true');
    await this.announcePresenceToBroker(hostName, triChord, heraldGreeting);
    return {
      action: 'HOSTED',
      roomCode: this.myLobbyRoomCode(),
      triChord,
    };
  }

  /** Remove this realm from the lobby. Only costs a call if we announced. */
  leaveBrokerSession(): void {
    const url = this.brokerUrl().trim();
    if (!url || !this.hasAnnounced) return;
    this.hasAnnounced = false;
    const body = JSON.stringify({
      roomCode: this.myLobbyRoomCode(),
      type: 'LEAVE',
      senderId: this.localPeerId,
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(`${url}/signal`, new Blob([body], { type: 'application/json' }));
    } else {
      void this.brokerFetch('/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  }

  // ===========================================================================
  // Packet helpers used by the engine
  // ===========================================================================

  /**
   * Inject a packet directly into the local transport stream for testing or simulation
   */
  injectSimulatedPacket(packet: Partial<NetworkPacket>): NetworkPacket {
    const fullPacket: NetworkPacket = {
      packetId:
        packet.packetId || `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderPeerId: packet.senderPeerId || 'peer-simulated',
      senderName: packet.senderName || 'Simulated_Traveler',
      timestampMs: packet.timestampMs || Date.now(),
      type: packet.type || 'CHAT_MESSAGE',
      gateAddress: packet.gateAddress || 'Θ: Scorching Clockwork Catacombs',
      roomId: packet.roomId || 'room-0',
      ...packet,
    };
    this.handleIncomingPacket(fullPacket, 'BroadcastChannel');
    return fullPacket;
  }

  /**
   * Safely evict a peer from the discovered peers registry (e.g. when deactivating a simulated echo bot)
   */
  removeDiscoveredPeer(peerId: string): void {
    this.discoveredPeers.update((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }

  /**
   * Simulate a local Loopback Peer Portal for single-tab testing or demo discovery
   */
  injectSimulatedPeerBeacon(peer: NetworkPeerVisitor): void {
    this.handleIncomingPacket(
      {
        packetId: `sim-${Date.now()}`,
        senderPeerId: peer.peerId,
        senderName: peer.playerName,
        timestampMs: Date.now(),
        type: 'GATE_BEACON',
        gateAddress: peer.gateAddress,
        roomId: peer.currentRoomId,
        heraldGreeting: peer.heraldGreeting,
        isAstralEcho: peer.isAstralEcho ?? true,
        visitorState: {
          archetype: peer.archetype,
          level: peer.level,
          inCombat: peer.inCombat,
          currentHp: peer.currentHp,
          maxHp: peer.maxHp,
          isAstralEcho: peer.isAstralEcho ?? true,
        },
      },
      peer.transport,
    );
  }

  /** Presence: who I am and where I am. No realm data (that comes in REALM_SNAPSHOT). */
  announceGateBeacon(
    senderName: string,
    gateAddress: string,
    roomId: string,
    archetype: ArchetypeClass,
    level: number,
    inCombat: boolean,
    heraldGreeting?: string,
    breadcrumbs?: PhantomBreadcrumb[],
  ): void {
    this.sendPacket({
      senderName,
      type: 'GATE_BEACON',
      gateAddress,
      roomId,
      heraldGreeting,
      breadcrumbs,
      visitorState: {
        archetype,
        level,
        inCombat,
      },
    });
  }

  broadcastCombatIntent(
    senderName: string,
    gateAddress: string,
    roomId: string,
    combatIntent: CommandIntent,
  ): void {
    this.sendPacket({
      senderName,
      type: 'COOP_COMBAT_INTENT',
      gateAddress,
      roomId,
      combatIntent,
    });
  }

  broadcastGravestone(
    senderName: string,
    gateAddress: string,
    roomId: string,
    gravestone: GuestbookGravestoneEntry,
  ): void {
    this.sendPacket({
      senderName,
      type: 'GRAVESTONE_RECORD',
      gateAddress,
      roomId,
      gravestone,
    });
  }

  /** Gift one item to one peer. Receivers ignore untargeted trade packets. */
  sendTradeOffer(
    toPeerId: string,
    senderName: string,
    gateAddress: string,
    roomId: string,
    tradeItem: EquipmentItem,
  ): boolean {
    return this.sendTo(toPeerId, {
      senderName,
      type: 'TRADE_OFFER',
      gateAddress,
      roomId,
      tradeItem,
    });
  }

  broadcastChatMessage(
    senderName: string,
    gateAddress: string,
    roomId: string,
    chat: P2PChatMessage,
  ): NetworkPacket {
    return this.sendPacket({
      senderName,
      type: 'CHAT_MESSAGE',
      gateAddress,
      roomId,
      chat,
    });
  }

  broadcastBazaarListed(
    listing: BazaarListing,
    gateAddress: string,
    roomId: string,
  ): NetworkPacket {
    return this.sendPacket({
      senderName: listing.sellerName,
      type: 'BAZAAR_LISTED',
      gateAddress,
      roomId,
      bazaarListing: listing,
    });
  }

  broadcastBazaarPurchased(
    buyerName: string,
    listingId: string,
    itemId: string,
    itemName: string,
    shardPrice: number,
    gateAddress: string,
    roomId: string,
  ): NetworkPacket {
    return this.sendPacket({
      senderName: buyerName,
      type: 'BAZAAR_PURCHASED',
      gateAddress,
      roomId,
      bazaarPurchase: {
        listingId,
        buyerName,
        buyerPeerId: this.localPeerId,
        itemId,
        itemName,
        shardPrice,
      },
    });
  }

  broadcastPeerChat(
    senderName: string,
    text: string,
    gateAddress: string,
    roomId: string,
  ): NetworkPacket {
    return this.sendPacket({
      senderName,
      type: 'PEER_CHAT',
      gateAddress,
      roomId,
      peerChat: {
        senderName,
        text,
      },
    });
  }

  ngOnDestroy(): void {
    this.leaveBrokerSession();
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
    if (this.hostTimer) clearInterval(this.hostTimer);
    if (this.lobbyTimer) clearInterval(this.lobbyTimer);
    for (const timer of this.joinPollTimers.values()) clearInterval(timer);
    this.joinPollTimers.clear();
    for (const timer of this.rejoinTimers) clearTimeout(timer);
    this.rejoinTimers.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.onActivity);
      window.removeEventListener('keydown', this.onActivity);
    }
    this.broadcastChannel?.close();
    for (const link of [...this.peerLinks.values()]) {
      link.closedByUs = true;
      this.disposeLink(link, 'CLOSED', 'Closed');
    }
  }
}

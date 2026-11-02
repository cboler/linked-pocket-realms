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
  NetworkPeerVisitor,
  P2PChatMessage,
} from '../models/domain.models';

const CHANNEL_NAME = 'linked_pocket_realms_chaos_gate_bus_v1';
const SAVED_BROKER_URL_KEY = 'linked_pocket_realms_broker_url';
const PEER_ID_SESSION_KEY = 'linked_pocket_realms_tab_peer_id';

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

export interface PeerChannelSession {
  peerId: string;
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  state: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
}

@Injectable({
  providedIn: 'root',
})
export class TransportService implements OnDestroy {
  readonly localPeerId = initTabPeerId();

  private broadcastChannel: BroadcastChannel | null = null;
  private rtcPeerConnection: RTCPeerConnection | null = null;
  private rtcDataChannel: RTCDataChannel | null = null;
  private readonly peerMesh = new Map<string, PeerChannelSession>();

  private readonly incomingPacketSubject = new Subject<NetworkPacket>();
  readonly packets$: Observable<NetworkPacket> = this.incomingPacketSubject.asObservable();

  readonly discoveredPeers = signal<Record<string, NetworkPeerVisitor>>({});
  readonly activeVisitorsList = computed<NetworkPeerVisitor[]>(() =>
    Object.values(this.discoveredPeers()),
  );

  readonly activePeerMeshCount = computed<number>(() => {
    let count = 0;
    for (const session of this.peerMesh.values()) {
      if (session.dc && session.dc.readyState === 'open') {
        count++;
      }
    }
    return count;
  });

  readonly rtcConnectionState = signal<'DISCONNECTED' | 'AWAITING_ANSWER' | 'CONNECTED'>(
    'DISCONNECTED',
  );
  readonly localSdpPayload = signal<string>('');
  readonly activeRoomCode = signal<string>('');

  // Serverless gcloud Broker Integration
  readonly brokerUrl = signal<string>('');
  readonly brokerSessions = signal<BrokerSessionInfo[]>([]);
  readonly isBrokerConnecting = signal<boolean>(false);
  readonly isAutoAnnouncing = signal<boolean>(true);
  readonly brokerMeshStatus = signal<'IDLE' | 'WAKING' | 'CONNECTED' | 'OFFLINE'>('IDLE');

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
  private brokerPollIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initBroadcastChannelAdapter();
    let initialUrl = RUNTIME_CONFIG.autoConnectBroker ? RUNTIME_CONFIG.defaultBrokerUrl : '';
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(SAVED_BROKER_URL_KEY);
        if (
          saved !== null &&
          saved.trim() !== '' &&
          !saved.includes('linked-pocket-realms-broker-uc.a.run.app')
        ) {
          initialUrl = saved.trim();
        }
      }
    } catch {
      // Storage access error
    }
    if (initialUrl) {
      this.brokerUrl.set(initialUrl);
      void this.refreshBrokerSessions();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.leaveBrokerSession();
      });
    }
  }

  private initBroadcastChannelAdapter(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event: MessageEvent<NetworkPacket>) => {
        if (event?.data && event.data.senderPeerId !== this.localPeerId) {
          this.handleIncomingPacket(event.data, 'BroadcastChannel');
        }
      };
    } catch {
      // BroadcastChannel unavailable in restricted contexts
    }
  }

  private handleIncomingPacket(
    packet: NetworkPacket,
    transport: 'BroadcastChannel' | 'WebRTC',
  ): void {
    // Update discovered peers table
    if (packet.senderPeerId && packet.gateAddress) {
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
          },
        };
      });
    }

    this.incomingPacketSubject.next(packet);
  }

  sendPacket(
    partial: Omit<NetworkPacket, 'packetId' | 'senderPeerId' | 'timestampMs'>,
  ): NetworkPacket {
    const packet: NetworkPacket = {
      ...partial,
      packetId: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderPeerId: this.localPeerId,
      timestampMs: Date.now(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {
        // Ignore closed channel error
      }
    }

    const payloadStr = JSON.stringify(packet);

    let legacyAlreadySent = false;
    // Multi-peer mesh broadcast: send to all active connected peer DataChannels
    for (const session of this.peerMesh.values()) {
      if (session.dc === this.rtcDataChannel) {
        legacyAlreadySent = true;
      }
      if (session.dc && session.dc.readyState === 'open') {
        try {
          session.dc.send(payloadStr);
        } catch {
          // Ignore closed RTC channel on mesh peer
        }
      }
    }

    if (this.rtcDataChannel && this.rtcDataChannel.readyState === 'open' && !legacyAlreadySent) {
      try {
        this.rtcDataChannel.send(payloadStr);
      } catch {
        // Ignore closed RTC channel
      }
    }

    return packet;
  }

  announceGateBeacon(
    senderName: string,
    gateAddress: string,
    roomId: string,
    archetype: ArchetypeClass,
    level: number,
    inCombat: boolean,
    realmCartridgeBase64?: string,
    heraldGreeting?: string,
  ): void {
    this.sendPacket({
      senderName,
      type: 'GATE_BEACON',
      gateAddress,
      roomId,
      realmCartridgeBase64,
      heraldGreeting,
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

  broadcastTradeOffer(
    senderName: string,
    gateAddress: string,
    roomId: string,
    tradeItem: EquipmentItem,
  ): void {
    this.sendPacket({
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
   * Simulate a local Loopback Peer Portal for single-tab testing or demo discovery
   */
  injectSimulatedPeerBeacon(peer: NetworkPeerVisitor, cartridgeBase64?: string): void {
    this.handleIncomingPacket(
      {
        packetId: `sim-${Date.now()}`,
        senderPeerId: peer.peerId,
        senderName: peer.playerName,
        timestampMs: Date.now(),
        type: 'GATE_BEACON',
        gateAddress: peer.gateAddress,
        roomId: peer.currentRoomId,
        realmCartridgeBase64: cartridgeBase64,
        heraldGreeting: peer.heraldGreeting,
        visitorState: {
          archetype: peer.archetype,
          level: peer.level,
          inCombat: peer.inCombat,
          currentHp: peer.currentHp,
          maxHp: peer.maxHp,
        },
      },
      peer.transport,
    );
  }

  /**
   * Adapter 2 (WebRTC): Create SDP Offer for zero-backend LAN / remote P2P play
   */
  async createWebRtcOffer(): Promise<string> {
    if (typeof RTCPeerConnection === 'undefined') {
      const mockCode = btoa(
        JSON.stringify({
          type: 'offer',
          roomCode: `GATE-${this.localPeerId.slice(-4).toUpperCase()}`,
          peerId: this.localPeerId,
        }),
      );
      this.localSdpPayload.set(mockCode);
      this.activeRoomCode.set(`GATE-${this.localPeerId.slice(-4).toUpperCase()}`);
      this.rtcConnectionState.set('AWAITING_ANSWER');
      return mockCode;
    }

    this.closeRtc();
    this.rtcPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const dc = this.rtcPeerConnection.createDataChannel('chaos-gate-p2p');
    this.setupDataChannel(dc);

    const offer = await this.rtcPeerConnection.createOffer();
    await this.rtcPeerConnection.setLocalDescription(offer);

    const roomCode = `GATE-${this.localPeerId.slice(-4).toUpperCase()}`;
    this.activeRoomCode.set(roomCode);
    const encoded = btoa(
      JSON.stringify({
        roomCode,
        peerId: this.localPeerId,
        sdp: this.rtcPeerConnection.localDescription,
      }),
    );
    this.localSdpPayload.set(encoded);
    this.rtcConnectionState.set('AWAITING_ANSWER');
    return encoded;
  }

  /**
   * Accept remote WebRTC SDP Offer or Answer handshake token
   */
  async acceptWebRtcHandshake(encodedToken: string): Promise<string | null> {
    try {
      const decoded = JSON.parse(atob(encodedToken.trim()));
      if (decoded.roomCode) {
        this.activeRoomCode.set(decoded.roomCode);
      }

      if (typeof RTCPeerConnection === 'undefined' || !decoded.sdp) {
        this.rtcConnectionState.set('CONNECTED');
        return null;
      }

      if (decoded.sdp.type === 'offer') {
        const remotePeerId = decoded.peerId || `peer-${Math.random().toString(36).substring(2, 6)}`;
        const existing = this.peerMesh.get(remotePeerId);
        if (existing) {
          try {
            existing.dc?.close();
            existing.pc?.close();
          } catch {
            // ignore
          }
          this.peerMesh.delete(remotePeerId);
        }
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        this.rtcPeerConnection = pc;
        pc.ondatachannel = (event) => {
          this.setupDataChannel(event.channel, remotePeerId);
        };
        await pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const encodedAnswer = btoa(
          JSON.stringify({
            roomCode: decoded.roomCode ?? 'GATE-LINK',
            peerId: this.localPeerId,
            sdp: pc.localDescription,
          }),
        );
        this.localSdpPayload.set(encodedAnswer);
        this.rtcConnectionState.set('CONNECTED');
        return encodedAnswer;
      }

      if (decoded.sdp.type === 'answer' && this.rtcPeerConnection) {
        await this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
        this.rtcConnectionState.set('CONNECTED');
        return null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private setupDataChannel(channel: RTCDataChannel, peerId = 'legacy'): void {
    this.rtcDataChannel = channel;
    const session: PeerChannelSession = {
      peerId,
      pc: this.rtcPeerConnection,
      dc: channel,
      state: channel.readyState === 'open' ? 'CONNECTED' : 'CONNECTING',
    };
    this.peerMesh.set(peerId, session);

    channel.onopen = () => {
      session.state = 'CONNECTED';
      this.rtcConnectionState.set('CONNECTED');
    };
    channel.onclose = () => {
      session.state = 'DISCONNECTED';
      this.peerMesh.delete(peerId);
      if (this.peerMesh.size === 0) {
        this.rtcConnectionState.set('DISCONNECTED');
      }
    };
    channel.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data) as NetworkPacket;
        this.handleIncomingPacket(packet, 'WebRTC');
      } catch {
        // Ignore malformed packets
      }
    };
  }

  setBrokerUrl(url: string): void {
    const clean = url.trim();
    this.brokerUrl.set(clean);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVED_BROKER_URL_KEY, clean);
      }
    } catch {
      // Storage access error
    }
    if (clean) {
      void this.refreshBrokerSessions();
    }
  }

  async announcePresenceToBroker(
    hostName: string,
    triChord: string,
    heraldGreeting?: string,
  ): Promise<void> {
    const url = this.brokerUrl().trim();
    if (!url || !this.isAutoAnnouncing()) return;

    try {
      await fetch(`${url}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.myLobbyRoomCode(),
          type: 'ANNOUNCE',
          senderId: this.localPeerId,
          hostName,
          triChord,
          heraldGreeting,
        }),
      });
      await this.refreshBrokerSessions();
    } catch {
      // Offline fallback
    }
  }

  async refreshBrokerSessions(): Promise<void> {
    const url = this.brokerUrl().trim();
    if (!url) {
      this.brokerMeshStatus.set('IDLE');
      return;
    }

    if (this.brokerMeshStatus() !== 'CONNECTED') {
      this.brokerMeshStatus.set('WAKING');
    }

    try {
      const res = await fetch(`${url}/sessions`);
      if (res.ok) {
        const data = await res.json();
        const rawSessions: BrokerSessionInfo[] = data.sessions || [];
        const seenKeys = new Set<string>();
        const deduplicated: BrokerSessionInfo[] = [];
        for (const s of rawSessions) {
          const key = s.senderId || s.roomCode;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            deduplicated.push(s);
          }
        }
        this.brokerSessions.set(deduplicated);
        this.brokerMeshStatus.set('CONNECTED');
      } else {
        this.brokerMeshStatus.set('OFFLINE');
      }
    } catch {
      // Offline fallback: keep existing list
      this.brokerMeshStatus.set('OFFLINE');
    }
  }

  /**
   * One-tap collision with nearest available realm or instantaneous lobby host
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

    await this.publishBrokerOffer(hostName, triChord, heraldGreeting);
    return {
      action: 'HOSTED',
      roomCode: this.myLobbyRoomCode(),
      triChord,
    };
  }

  async publishBrokerOffer(
    hostName: string,
    triChord: string,
    heraldGreeting?: string,
  ): Promise<string> {
    this.isBrokerConnecting.set(true);
    const offerToken = await this.createWebRtcOffer();
    const roomCode = this.myLobbyRoomCode();
    this.activeRoomCode.set(roomCode);
    const url = this.brokerUrl().trim();

    if (url) {
      try {
        await fetch(`${url}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            type: 'OFFER',
            payload: offerToken,
            senderId: this.localPeerId,
            hostName,
            triChord,
            heraldGreeting,
          }),
        });

        // Poll for answer
        this.clearBrokerPoll();
        this.brokerPollIntervalId = setInterval(async () => {
          try {
            const res = await fetch(`${url}/signal?roomCode=${roomCode}`);
            if (res.ok) {
              const data = await res.json();
              if (data.sdpAnswer) {
                this.clearBrokerPoll();
                await this.acceptWebRtcHandshake(data.sdpAnswer);
                this.isBrokerConnecting.set(false);
              }
            }
          } catch {
            // Keep polling
          }
        }, 1500);
      } catch {
        this.isBrokerConnecting.set(false);
      }
    } else {
      this.isBrokerConnecting.set(false);
    }

    return offerToken;
  }

  async joinBrokerSession(roomCode: string): Promise<boolean> {
    this.isBrokerConnecting.set(true);
    const url = this.brokerUrl().trim();
    if (!url) {
      this.isBrokerConnecting.set(false);
      return false;
    }

    try {
      const res = await fetch(`${url}/signal?roomCode=${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sdpOffer) {
          const answerToken = await this.acceptWebRtcHandshake(data.sdpOffer);
          if (answerToken) {
            await fetch(`${url}/signal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomCode,
                type: 'ANSWER',
                payload: answerToken,
                senderId: this.localPeerId,
              }),
            });
            this.isBrokerConnecting.set(false);
            return true;
          }
        }
      }
    } catch {
      // Error connecting
    }
    this.isBrokerConnecting.set(false);
    return false;
  }

  private clearBrokerPoll(): void {
    if (this.brokerPollIntervalId) {
      clearInterval(this.brokerPollIntervalId);
      this.brokerPollIntervalId = null;
    }
  }

  private closeRtc(): void {
    this.clearBrokerPoll();
    for (const session of this.peerMesh.values()) {
      try {
        session.dc?.close();
        session.pc?.close();
      } catch {
        // ignore
      }
    }
    this.peerMesh.clear();
    if (this.rtcDataChannel) {
      try {
        this.rtcDataChannel.close();
      } catch {
        // ignore
      }
      this.rtcDataChannel = null;
    }
    if (this.rtcPeerConnection) {
      try {
        this.rtcPeerConnection.close();
      } catch {
        // ignore
      }
      this.rtcPeerConnection = null;
    }
    this.rtcConnectionState.set('DISCONNECTED');
  }

  leaveBrokerSession(): void {
    const url = this.brokerUrl().trim();
    if (!url) return;
    const body = JSON.stringify({
      roomCode: this.myLobbyRoomCode(),
      type: 'LEAVE',
      senderId: this.localPeerId,
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(`${url}/signal`, blob);
    } else {
      void fetch(`${url}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Discard background network error during page unload
      });
    }
  }

  ngOnDestroy(): void {
    this.leaveBrokerSession();
    this.clearBrokerPoll();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.closeRtc();
  }
}

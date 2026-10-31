import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import {
  ArchetypeClass,
  CommandIntent,
  EquipmentItem,
  GuestbookGravestoneEntry,
  NetworkPacket,
  NetworkPeerVisitor,
} from '../models/domain.models';

const CHANNEL_NAME = 'linked_pocket_realms_chaos_gate_bus_v1';

@Injectable({
  providedIn: 'root',
})
export class TransportService implements OnDestroy {
  readonly localPeerId = `peer-${Math.random().toString(36).substring(2, 9)}`;

  private broadcastChannel: BroadcastChannel | null = null;
  private rtcPeerConnection: RTCPeerConnection | null = null;
  private rtcDataChannel: RTCDataChannel | null = null;

  private readonly incomingPacketSubject = new Subject<NetworkPacket>();
  readonly packets$: Observable<NetworkPacket> = this.incomingPacketSubject.asObservable();

  readonly discoveredPeers = signal<Record<string, NetworkPeerVisitor>>({});
  readonly activeVisitorsList = computed<NetworkPeerVisitor[]>(() =>
    Object.values(this.discoveredPeers()),
  );

  readonly rtcConnectionState = signal<'DISCONNECTED' | 'AWAITING_ANSWER' | 'CONNECTED'>(
    'DISCONNECTED',
  );
  readonly localSdpPayload = signal<string>('');
  readonly activeRoomCode = signal<string>('');

  constructor() {
    this.initBroadcastChannelAdapter();
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

    if (this.rtcDataChannel && this.rtcDataChannel.readyState === 'open') {
      try {
        this.rtcDataChannel.send(JSON.stringify(packet));
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
  ): void {
    this.sendPacket({
      senderName,
      type: 'GATE_BEACON',
      gateAddress,
      roomId,
      realmCartridgeBase64,
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
        visitorState: {
          archetype: peer.archetype,
          level: peer.level,
          inCombat: peer.inCombat,
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
        this.closeRtc();
        this.rtcPeerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        this.rtcPeerConnection.ondatachannel = (event) => {
          this.setupDataChannel(event.channel);
        };
        await this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
        const answer = await this.rtcPeerConnection.createAnswer();
        await this.rtcPeerConnection.setLocalDescription(answer);
        const encodedAnswer = btoa(
          JSON.stringify({
            roomCode: decoded.roomCode ?? 'GATE-LINK',
            peerId: this.localPeerId,
            sdp: this.rtcPeerConnection.localDescription,
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

  private setupDataChannel(channel: RTCDataChannel): void {
    this.rtcDataChannel = channel;
    channel.onopen = () => {
      this.rtcConnectionState.set('CONNECTED');
    };
    channel.onclose = () => {
      this.rtcConnectionState.set('DISCONNECTED');
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

  private closeRtc(): void {
    if (this.rtcDataChannel) {
      this.rtcDataChannel.close();
      this.rtcDataChannel = null;
    }
    if (this.rtcPeerConnection) {
      this.rtcPeerConnection.close();
      this.rtcPeerConnection = null;
    }
  }

  ngOnDestroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.closeRtc();
  }
}

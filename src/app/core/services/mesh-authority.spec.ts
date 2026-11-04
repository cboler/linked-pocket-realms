import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EquipmentItem, NetworkPacket } from '../models/domain.models';
import { MudEngineService } from './mud-engine.service';
import { StorageService } from './storage.service';
import { ChannelLike, TransportService } from './transport.service';

/** One simulated player: its own storage, transport, and engine. */
interface Player {
  id: string;
  injector: EnvironmentInjector;
  transport: TransportService;
  engine: MudEngineService;
}

interface FakeChannel {
  readyState: string;
  send: (data: string) => void;
  close: () => void;
  onopen: ChannelLike['onopen'];
  onclose: ChannelLike['onclose'];
  onmessage: ChannelLike['onmessage'];
}

/** An in-memory pair of connected data channels (delivery is async, like the real thing). */
function channelPair(): [FakeChannel, FakeChannel] {
  const make = (): FakeChannel => ({
    readyState: 'open',
    send: () => undefined,
    close: () => undefined,
    onopen: null,
    onclose: null,
    onmessage: null,
  });
  const a = make();
  const b = make();
  const wire = (from: FakeChannel, to: FakeChannel): void => {
    from.send = (data: string) => {
      if (to.readyState !== 'open') return;
      queueMicrotask(() => to.onmessage?.({ data } as MessageEvent));
    };
    from.close = () => {
      if (from.readyState === 'closed') return;
      from.readyState = 'closed';
      to.readyState = 'closed';
      // Like RTCDataChannel: both ends see the close.
      from.onclose?.(new Event('close'));
      to.onclose?.(new Event('close'));
    };
  };
  wire(a, b);
  wire(b, a);
  return [a, b];
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const players: Player[] = [];

function makePlayer(id: string): Player {
  const injector = createEnvironmentInjector(
    [StorageService, TransportService, MudEngineService],
    TestBed.inject(EnvironmentInjector),
  );
  const transport = injector.get(TransportService);
  (transport as unknown as { localPeerId: string }).localPeerId = id;
  // Isolate from other in-process transports: only the links under test carry packets.
  transport.closeBroadcastChannel();
  const engine = injector.get(MudEngineService);
  engine.stopAtbLoop();
  const player = { id, injector, transport, engine };
  players.push(player);
  return player;
}

/** Link a visitor to a host. Host side first, so the visitor's hello finds an open link. */
function link(host: Player, visitor: Player): [FakeChannel, FakeChannel] {
  const [hostEnd, visitorEnd] = channelPair();
  host.transport.attachChannel(visitor.id, 'VISITOR', hostEnd, visitor.engine.character().name);
  visitor.transport.attachChannel(host.id, 'HOST', visitorEnd, host.engine.character().name);
  return [hostEnd, visitorEnd];
}

function firstMonsterRoom(p: Player) {
  const room = p.engine.rooms().find((r) => r.monsters.some((m) => m.hp > 0) && !r.isExpedition);
  if (!room) throw new Error('no monster room');
  return room;
}

function setMonsterHp(p: Player, roomId: string, monsterId: string, hp: number, maxHp?: number) {
  p.engine.rooms.update((all) =>
    all.map((r) =>
      r.id !== roomId
        ? r
        : {
            ...r,
            monsters: r.monsters.map((m) =>
              m.id === monsterId ? { ...m, hp, maxHp: maxHp ?? Math.max(m.maxHp, hp) } : m,
            ),
          },
    ),
  );
}

function hostMonster(host: Player, roomId: string, monsterId: string) {
  return host.engine
    .rooms()
    .find((r) => r.id === roomId)
    ?.monsters.find((m) => m.id === monsterId);
}

describe('Host-authority mesh', () => {
  let host: Player;
  let visitor: Player;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    host = makePlayer('peer-host');
    host.engine.completeOnboardingAwakening(
      'Ari',
      'Vanguard',
      'Θ',
      'Scorching',
      'Clockwork',
      'Catacombs',
    );
    visitor = makePlayer('peer-visitor');
    visitor.engine.completeOnboardingAwakening(
      'Bea',
      'Hexblade',
      'Δ',
      'Silent',
      'Fungal',
      'Observatory',
    );
    await settle();
  });

  afterEach(() => {
    for (const p of players.splice(0)) p.injector.destroy();
  });

  it('enters the host realm from the host, with the host’s live room state', async () => {
    link(host, visitor);
    await settle();
    // Damage a monster on the host, then enter again: the snapshot carries live HP.
    const room = firstMonsterRoom(host);
    const mob = room.monsters[0];
    setMonsterHp(host, room.id, mob.id, 5);
    visitor.engine.visitPeerRealm('peer-host');
    await settle();
    expect(visitor.engine.authorityHost()?.peerId).toBe('peer-host');
    expect(visitor.engine.activeGateAddress().formatted).toBe(
      host.engine.activeGateAddress().formatted,
    );
    expect(visitor.engine.isVisitingExternalRealm()).toBe(true);
    const mirrored = visitor.engine
      .rooms()
      .find((r) => r.id === room.id)
      ?.monsters.find((m) => m.id === mob.id);
    expect(mirrored?.hp).toBe(5);
    expect(host.engine.realmVisitors()['peer-visitor']?.name).toBe('Bea');
  });

  it('lets the host decide kills and credits the visitor', async () => {
    link(host, visitor);
    await settle();
    const room = firstMonsterRoom(host);
    const mob = room.monsters[0];
    setMonsterHp(host, room.id, mob.id, 1);
    host.engine['broadcastRoomState'](room.id);
    await settle();

    visitor.engine.character.update((c) => ({ ...c, currentRoomId: room.id }));
    const hostXpBefore = host.engine.character().xp;
    const visitorXpBefore = visitor.engine.character().xp;

    for (let i = 0; i < 10 && (hostMonster(host, room.id, mob.id)?.hp ?? 0) > 0; i++) {
      visitor.engine['executePlayerCombatMove']({
        type: 'ATTACK',
        rawInput: 'attack',
        source: 'HUD',
        targetId: mob.id,
      });
      // Locally the hit never kills: that's the host's call.
      const local = visitor.engine
        .rooms()
        .find((r) => r.id === room.id)
        ?.monsters.find((m) => m.id === mob.id);
      if ((hostMonster(host, room.id, mob.id)?.hp ?? 0) > 0)
        expect(local?.hp).toBeGreaterThanOrEqual(1);
      await settle();
      host.engine['lastVisitorHitMs'].clear();
    }

    expect(hostMonster(host, room.id, mob.id)?.hp).toBe(0);
    const visitorMob = visitor.engine
      .rooms()
      .find((r) => r.id === room.id)
      ?.monsters.find((m) => m.id === mob.id);
    expect(visitorMob?.hp).toBe(0);
    expect(visitor.engine.character().xp).toBeGreaterThan(visitorXpBefore);
    expect(host.engine.character().xp).toBe(hostXpBefore);
  });

  it('clamps absurd damage from a modified visitor', async () => {
    link(host, visitor);
    await settle();
    const room = firstMonsterRoom(host);
    const mob = room.monsters[0];
    setMonsterHp(host, room.id, mob.id, 100_000, 100_000);

    visitor.transport.sendTo('peer-host', {
      senderName: 'Bea',
      type: 'ACTION_DAMAGE',
      gateAddress: host.engine.activeGateAddress().formatted,
      roomId: room.id,
      authority: { monsterId: mob.id, damage: 1e9 },
    });
    await settle();

    const cap = host.engine['maxVisitorHit'](visitor.engine.character().level);
    expect(hostMonster(host, room.id, mob.id)?.hp).toBe(100_000 - cap);
  });

  it('gives a contested item to exactly one visitor', async () => {
    const second = makePlayer('peer-second');
    second.engine.completeOnboardingAwakening(
      'Cid',
      'Artificer',
      'Λ',
      'Blighted',
      'Fungal',
      'Catacombs',
    );
    await settle();
    link(host, visitor);
    link(host, second);
    await settle();
    expect(second.engine.authorityHost()?.peerId).toBe('peer-host');

    const roomId = host.engine.rooms()[0].id;
    const prize: EquipmentItem = {
      id: 'contested-relic',
      name: 'Contested Relic',
      slot: 'Main-Hand',
      rarity: 'Rare',
      weight: 1,
      totalStatBudget: 5,
      statBonuses: { atkBonus: 3 },
      provenance: 'Verified Drop',
      originGateAddress: host.engine.activeGateAddress().formatted,
      isLocked: false,
    };
    host.engine.rooms.update((all) =>
      all.map((r) => (r.id === roomId ? { ...r, items: [prize] } : r)),
    );
    host.engine['broadcastRoomState'](roomId);
    await settle();

    for (const p of [visitor, second]) {
      p.engine.character.update((c) => ({ ...c, currentRoomId: roomId }));
      p.engine.takeRoomItem('contested-relic');
    }
    await settle();

    const holders = [visitor, second].filter((p) =>
      p.engine.character().inventory.some((i) => i.id === 'contested-relic'),
    );
    expect(holders.length).toBe(1);
    expect(host.engine.rooms().find((r) => r.id === roomId)?.items.length).toBe(0);
    const loser = holders[0] === visitor ? second : visitor;
    expect(
      loser.engine.terminalFeed().some((l) => l.text.includes('Someone already took that')),
    ).toBe(true);
  });

  it('relays chat between visitors but drops packets that fake their sender', async () => {
    const second = makePlayer('peer-second');
    second.engine.completeOnboardingAwakening(
      'Cid',
      'Artificer',
      'Λ',
      'Blighted',
      'Fungal',
      'Catacombs',
    );
    await settle();
    const [, visitorEnd] = link(host, visitor);
    link(host, second);
    await settle();

    const received: NetworkPacket[] = [];
    const sub = second.transport.packets$.subscribe((p) => received.push(p));
    visitor.transport.broadcastPeerChat(
      'Bea',
      'hello from Bea',
      host.engine.activeGateAddress().formatted,
      'room-0',
    );
    await settle();
    const relayed = received.find((p) => p.type === 'PEER_CHAT');
    expect(relayed?.peerChat?.text).toBe('hello from Bea');
    expect(relayed?.relayedBy).toBe('peer-host');

    const hostSeen: NetworkPacket[] = [];
    const hostSub = host.transport.packets$.subscribe((p) => hostSeen.push(p));
    visitorEnd.send(
      JSON.stringify({
        packetId: 'forged-1',
        senderPeerId: 'peer-second',
        senderName: 'Cid',
        timestampMs: Date.now(),
        type: 'PEER_CHAT',
        gateAddress: host.engine.activeGateAddress().formatted,
        peerChat: { senderName: 'Cid', text: 'I am not really Cid' },
      }),
    );
    await settle();
    expect(hostSeen.some((p) => p.packetId === 'forged-1')).toBe(false);
    sub.unsubscribe();
    hostSub.unsubscribe();
  });

  it('falls back to an offline copy when the link drops, and the host forgets the visitor', async () => {
    const [hostEnd] = link(host, visitor);
    await settle();
    expect(visitor.engine.authorityHost()).not.toBeNull();

    hostEnd.close();
    await settle();

    expect(visitor.engine.authorityHost()).toBeNull();
    expect(visitor.engine.terminalFeed().some((l) => l.text.includes('offline copy'))).toBe(true);
    expect(host.engine.realmVisitors()['peer-visitor']).toBeUndefined();
  });

  it('lets a visitor of the right class open a chest, decided by the host', async () => {
    link(host, visitor);
    await settle();
    const roomId = host.engine.rooms()[1].id;
    const chest = {
      id: 'chest-mp',
      name: 'Iron-banded strongbox',
      seal: 'LOCK' as const,
      tier: 1,
      items: [
        {
          id: 'mp-loot',
          name: 'Shared Loot',
          slot: 'Main-Hand' as const,
          rarity: 'Rare' as const,
          weight: 1,
          totalStatBudget: 5,
          statBonuses: { atkBonus: 2 },
          provenance: 'Verified Drop' as const,
          originGateAddress: 'x',
          isLocked: false,
        },
      ],
      lockpicks: 1,
      opened: false,
    };
    for (const p of [host, visitor]) {
      p.engine.rooms.update((all) =>
        all.map((r) => (r.id === roomId ? { ...r, chests: [chest] } : r)),
      );
    }
    // The visitor is a Hexblade with a pick.
    visitor.engine.character.update((c) => ({ ...c, currentRoomId: roomId, lockpicks: 1 }));
    visitor.engine['combatRng'] = () => 0;
    visitor.engine.openChest();
    await settle();

    const hostChest = host.engine.rooms().find((r) => r.id === roomId)?.chests?.[0];
    expect(hostChest?.opened).toBe(true);
    expect(
      host.engine
        .rooms()
        .find((r) => r.id === roomId)
        ?.items.some((i) => i.id === 'mp-loot'),
    ).toBe(true);
    expect(visitor.engine.rooms().find((r) => r.id === roomId)?.chests?.[0].opened).toBe(true);
    expect(visitor.engine.character().lockpicks).toBe(2);
  });

  it('lets one player carry another to a campfire, and asks before they get up', async () => {
    link(host, visitor);
    await settle();
    const fire = host.engine.rooms().find((r) => r.legendType === 'safe-campfire')!;
    expect(fire).toBeTruthy();
    const fightRoom = host.engine.rooms().find((r) => r.id !== fire.id && r.monsters.length > 0)!;
    host.engine.character.update((c) => ({ ...c, currentRoomId: fightRoom.id }));
    visitor.engine.character.update((c) => ({ ...c, currentRoomId: fightRoom.id }));
    host.engine.sendPresenceBeacon();
    visitor.engine.sendPresenceBeacon();
    await settle();

    visitor.engine['handlePlayerWipe'](fightRoom.monsters[0]);
    await settle();
    expect(visitor.engine.playerDowned()?.roomId).toBe(fightRoom.id);
    expect(host.transport.discoveredPeers()['peer-visitor']?.downed).toBe(true);

    host.engine.carryPeer('peer-visitor');
    await settle();
    expect(visitor.engine.playerDowned()?.carriedBy?.id).toBe('peer-host');

    host.engine.moveToRoom(fire.id);
    await settle();
    expect(visitor.engine.playerDowned()?.campfireOffer?.roomId).toBe(fire.id);
    expect(visitor.engine.character().currentRoomId).toBe(fire.id);

    visitor.engine.acceptCampfireRevival();
    await settle();
    expect(visitor.engine.playerDowned()).toBeNull();
    expect(visitor.engine.character().hp).toBeGreaterThan(0);
    expect(host.engine.carryingPeer()).toBeNull();
  });

  it('tells visitors when the host leaves home', async () => {
    link(host, visitor);
    await settle();
    host.engine.dialChaosGate('Ω', 'Abyssal', 'Clockwork', 'Catacombs', true);
    await settle();
    expect(visitor.engine.authorityHost()).toBeNull();
    expect(visitor.engine.terminalFeed().some((l) => l.text.includes('left their dungeon'))).toBe(
      true,
    );
  });
});

describe('Transport hygiene', () => {
  let transport: TransportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    transport = TestBed.inject(TransportService);
    transport.closeBroadcastChannel();
  });

  it('expires peers that went quiet, but keeps the simulated Astral Echo', () => {
    const old = Date.now() - 60_000;
    transport.discoveredPeers.set({
      'peer-gone': {
        peerId: 'peer-gone',
        playerName: 'Gone',
        archetype: 'Vanguard',
        level: 1,
        gateAddress: 'Δ: Silent Fungal Observatory',
        currentRoomId: 'room-0',
        inCombat: false,
        lastSeenMs: old,
        transport: 'BroadcastChannel',
      },
      'peer-astral-echo': {
        peerId: 'peer-astral-echo',
        playerName: 'Kite_Zero',
        archetype: 'Chronomancer',
        level: 4,
        gateAddress: 'Δ: Silent Fungal Observatory',
        currentRoomId: 'room-2',
        inCombat: false,
        lastSeenMs: old,
        transport: 'BroadcastChannel',
        isAstralEcho: true,
      },
    });
    transport.expireStalePeers();
    expect(Object.keys(transport.discoveredPeers())).toEqual(['peer-astral-echo']);
  });

  it('never calls the broker while hosting is closed', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      transport.brokerUrl.set('https://broker.test');
      transport.hostingOpen.set(false);
      await transport['hostHeartbeatTick'](true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
      transport.brokerUrl.set('');
    }
  });

  it('stops calling the broker after the daily cap', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      transport.brokerUrl.set('https://broker.test');
      localStorage.setItem(
        'lpr_broker_calls',
        JSON.stringify({
          day: new Date().toISOString().slice(0, 10),
          n: transport.dailyBrokerCallCap,
        }),
      );
      const res = await transport.brokerFetch('/sessions');
      expect(res).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(transport.brokerNotice()).toContain('free server limit');
    } finally {
      localStorage.removeItem('lpr_broker_calls');
      globalThis.fetch = originalFetch;
      transport.brokerUrl.set('');
    }
  });

  it('drops malformed and oversized packets', () => {
    const seen: NetworkPacket[] = [];
    const sub = transport.packets$.subscribe((p) => seen.push(p));
    const [mine, theirs] = channelPair();
    transport.attachChannel('peer-x', 'VISITOR', mine, 'X');
    theirs.send('not json');
    theirs.send(
      JSON.stringify({
        packetId: 'p1',
        senderPeerId: 'peer-x',
        type: 'NOT_A_TYPE',
        gateAddress: 'g',
      }),
    );
    theirs.send('x'.repeat(70_000));
    return settle().then(() => {
      expect(seen.length).toBe(0);
      sub.unsubscribe();
    });
  });
});

describe('Broker handshake (fake WebRTC)', () => {
  const originalPc = (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection;

  class FakePeerConnection {
    iceGatheringState = 'complete';
    connectionState = 'new';
    localDescription: (RTCSessionDescriptionInit & { toJSON(): RTCSessionDescriptionInit }) | null =
      null;
    onconnectionstatechange: (() => void) | null = null;
    ondatachannel: ((ev: { channel: unknown }) => void) | null = null;
    createDataChannel() {
      return {
        readyState: 'connecting',
        send: () => undefined,
        close: () => undefined,
        onopen: null,
        onclose: null,
        onmessage: null,
      };
    }
    async createOffer() {
      return { type: 'offer', sdp: 'v=0 fake-offer' };
    }
    async createAnswer() {
      return { type: 'answer', sdp: 'v=0 fake-answer' };
    }
    async setLocalDescription(d: RTCSessionDescriptionInit) {
      this.localDescription = { ...d, toJSON: () => ({ type: d.type, sdp: d.sdp }) };
    }
    async setRemoteDescription() {
      return undefined;
    }
    addEventListener() {
      return undefined;
    }
    removeEventListener() {
      return undefined;
    }
    close() {
      return undefined;
    }
  }

  beforeEach(() => {
    (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = FakePeerConnection;
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    for (const p of players.splice(0)) p.injector.destroy();
    (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = originalPc;
  });

  for (const brokerVersion of ['updated', 'older'] as const) {
    it(`host heartbeat answers a join request (${brokerVersion} broker)`, async () => {
      const hostT = makePlayer('peer-host').transport;
      const visitorT = makePlayer('peer-visitor').transport;
      const joinCode = await visitorT.createJoinCode();
      expect(joinCode).toBeTruthy();

      const posts: Record<string, unknown>[] = [];
      const offerSignal = { type: 'OFFER', payload: joinCode, timestampMs: Date.now() };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string) as Record<string, unknown>;
          posts.push(body);
          const signals =
            brokerVersion === 'updated' && body['type'] === 'ANNOUNCE' ? [offerSignal] : undefined;
          return new Response(JSON.stringify({ status: 'SIGNAL_RECORDED', signals }), {
            status: 200,
          });
        }
        if (url.includes('/signal?')) {
          return new Response(JSON.stringify({ signals: [offerSignal] }), { status: 200 });
        }
        return new Response('{}', { status: 404 });
      }) as typeof fetch;

      try {
        hostT.brokerUrl.set('https://broker.test');
        await hostT.announcePresenceToBroker('Ari', 'Θ: Scorching Clockwork Catacombs');
        const answer = posts.find((p) => p['type'] === 'ANSWER');
        expect(answer?.['to']).toBe('peer-visitor');
        expect(hostT.links().some((l) => l.peerId === 'peer-visitor' && l.role === 'VISITOR')).toBe(
          true,
        );

        const result = await visitorT.useConnectionCode(answer?.['payload'] as string);
        expect(result.ok).toBe(true);
        expect(
          visitorT.links().some((l) => l.peerId === 'peer-host' && l.state === 'CONNECTING'),
        ).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
        hostT.brokerUrl.set('');
      }
    });
  }
});

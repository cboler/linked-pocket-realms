# Execution Plan: Shadow Bazaar Dungeon Economy & P2P2P Multi-Client Mesh

- **Date**: 2026-11-01
- **Status**: Completed
- **Owner**: Antigravity

## 1. Goal & Objectives

Implement both core features requested by the user:

1. **Shadow Bazaar & Dungeon Economy**:
   - Enable architects to establish merchant stalls/dead-drops in their chambers (`@bazaar sell <item> <price>`, `@bazaar buy <item>`, `@bazaar list`, `@bazaar claim`).
   - Sanctum Vault tracking collected shard revenue from visitor purchases (including offline visit yields).
   - Immutable **Item Provenance Chains** on relics and equipment items (`ProvenanceRecord[]`: action, architect, realm, timestamp, price).
   - Interactive 2.5D Shadow Trader stall rendered in `first-person-stage.html` with interactive narrative chips in `app.html`.
2. **Multi-Peer P2P2P WebRTC Mesh & Live Co-Delver Presence**:
   - Upgrade `TransportService` from a single 1-to-1 WebRTC connection to a multi-peer WebRTC DataChannel mesh (`Map<string, { pc: RTCPeerConnection, dc: RTCDataChannel | null }>`), enabling arbitrary peers to connect to each other.
   - Support mesh broadcast: packets received from one peer can be routed or broadcast across all active data channels.
   - Track `peersInCurrentRoom` computed signal in `MudEngineService`.
   - Render live co-adventurer silhouettes in the 2.5D first-person viewport (`data-testid="fp-peer-adventurer"`) with archetype heraldry, level, HP indicator, and real-time speech bubbles from `@say` / `@party`.
   - Dynamic room prose incorporating present adventurers.

## 2. Invariants & Constraints

- Angular 22+ single-page PWA deployed on GitHub Pages with zero server-side dependencies.
- Zero third-party runtime dependencies. Native WebRTC, Signals, Web Audio, and SVG only.
- Strict mobile-first accessibility ($\ge 44\text{px}$ touch targets, safe area insets, no horizontal overflow).
- Quality gates: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run e2e`.

## 3. Detailed Architecture & Design

### Phase 1: Domain Models (`src/app/core/models/domain.models.ts`)

- Define `ProvenanceRecord`: `{ action: 'Forged' | 'Spliced' | 'Bartered' | 'Plundered'; architect: string; realm: string; timestamp: number; price?: number }`.
- Extend `EquipmentItem` with `provenanceChain?: ProvenanceRecord[]`.
- Define `BazaarListing`: `{ id: string; sellerName: string; sellerAddress: ChaosGateAddress; item: EquipmentItem; shardPrice: number; listedAt: number }`.
- Extend `RoomNode` and `RoomDeltaOverride` with `bazaar?: BazaarListing[]`.
- Extend `DungeonCartridge` and `MudEngineState` with `sanctumVaultShards: number` (uncollected bazaar revenue).
- Add network packet types:
  - `BAZAAR_LISTED` (syncs new item in bazaar stall across mesh).
  - `BAZAAR_PURCHASED` (notifies seller/mesh of item purchase, triggers vault shard crediting).
  - `PEER_CHAT` (broadcasts in-room speech bubbles from `@say` or `@party`).
  - Extend `NetworkPacket` with peer mesh routing fields (`targetPeerId?`, `relayedBy?`).

### Phase 2: Transport Service Multi-Peer Mesh (`src/app/core/services/transport.service.ts`)

- Replace single `rtcPeerConnection` and `rtcDataChannel` with a multi-connection map:
  - `private peerMesh = new Map<string, { pc: RTCPeerConnection; dc: RTCDataChannel | null; connectedAt: number }>()`.
- In `sendPacket(packet)`: broadcast over `BroadcastChannel` AND to _all_ open data channels in `peerMesh`.
- In WebRTC signaling:
  - Support multi-peer offer/answer generation: `generateMultiPeerOffer(targetPeerId?: string)`.
  - Accept answers and ice candidates per `peerId`.
  - In broker signaling / auto-connect: establish connections to multiple discovered broker sessions rather than replacing the single connection.
- Track `connectedPeerCount` computed signal.

### Phase 3: MUD Engine State & Bazaar Mechanics (`src/app/core/services/mud-engine.service.ts`)

- Implement `sanctumVaultShards` signal for uncollected revenue.
- Implement `@bazaar` terminal commands and programmatic methods:
  - `listBazaarItems(roomId?: string)`
  - `sellBazaarItem(itemId: string, price: number, roomId?: string)`
  - `buyBazaarItem(listingId: string, roomId?: string)`
  - `claimSanctumVaultRevenue()` (`@vault claim` / `@bazaar claim`)
- Update item drop generators: stamp newly found relics with an initial `ProvenanceRecord` (`action: 'Forged' | 'Plundered'`).
- Handle incoming `BAZAAR_PURCHASED` packet:
  - If we are the seller (or realm host): deposit `shardPrice` into `sanctumVaultShards`, append narrative feed message, play harvest chime.
- Implement `peersInCurrentRoom` computed signal:
  - Filters `transport.activeVisitorsList()` where `currentRoomId === currentRoom().id` and `lastSeenMs` is recent (< 60s).
- Implement `@say <message>` and `@party <message>` broadcasting `PEER_CHAT` packet.
- Track `peerChatMessages` signal (`Record<string, { text: string; timestamp: number }>`) for rendering floating speech bubbles over co-delver avatars.
- Weave bazaar stalls and present delvers into `emitCurrentRoomNarrative()`.

### Phase 4: 2.5D First-Person Viewport & HUD Stage (`src/app/viewport/first-person-stage.*`, `src/app/app.*`)

- In `first-person-stage.html`:
  - Render **Shadow Bazaar Stall**:
    - Mysterious hooded shadow merchant silhouette / stall prop with glowing blue resonance lanterns (`data-testid="fp-bazaar-stall"`).
  - Render **Live Co-Adventurers** (`peersInCurrentRoom()`):
    - Render 2.5D SVG adventurer silhouettes on left/right wings of the chamber stage with archetype badges (Vanguard sword/shield, Mystic floating runes, Shadowblade cloaked blades, Luminary dawn aura).
    - Render health bar and player nameplate above each adventurer (`data-testid="fp-peer-adventurer"`).
    - Render dynamic speech bubble (`speech-bubble-pop`) when `peerChatMessages()[peer.peerId]` is active.
- In `app.html` & `styles.scss`:
  - Add interactive narrative prose chips:
    - `[🏪 Shadow Stall: X Items]`
    - `[Buy [Item Name] (Y Shards)]`
    - `[💰 Claim Vault: Z Shards]`
    - `[👋 Say hello to Delver]`
  - Add Bazaar Stall inspection drawer / modal or quick-buy card.
  - Add Sanctum Vault counter to the header or paperdoll drawer.

### Phase 5: Verification & Testing

- Unit tests in `app.spec.ts`:
  - Bazaar listing creation, buying, shard transfer, vault revenue accumulation, and provenance chain updates.
  - Multi-peer transport mesh packet broadcasting.
  - `peersInCurrentRoom` computation and peer chat bubbles.
- Automated quality gates:
  - `npm test`
  - `npm run lint`
  - `npm run format:check`
  - `npm run build`
  - `npm run e2e` (Playwright across all 4 viewports).

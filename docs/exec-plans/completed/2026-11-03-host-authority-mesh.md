# Execution Plan: Working Host-Authority Mesh, Frugal Broker Use, Honest Connectivity

- **Date**: 2026-11-03
- **Status**: Completed (2026-11-03)
- **Owner**: Claude Code (Opus 5.5)

## 1. Goal & Objectives

1. Players can actually connect browser-to-browser, and a realm owner can host **several visitors at once**.
2. The **realm owner is the authority** for their realm: monster health, kills, and loot are decided by the host; visitors send requests.
3. Links are **resilient**: heartbeats, timeouts, clean failure messages, and automatic rejoin for broker-made links.
4. **Stale presence** disappears and presence traffic is slim.
5. Broker use stays far inside the GCP free tier (2M requests/month), with guards on both client and server.
6. The UI says plainly that connections work on most Wi-Fi but may fail on mobile data or strict networks (no relay server).

Out of scope: TURN relay (under discussion), forged Verified Drops (TD-05), combat tuning, Astral Echo pawn behavior (roadmap only).

## 2. Context & Background (findings)

- **Connections could not succeed**: offers/answers were encoded right after `setLocalDescription`, before ICE gathering, so tokens carried no candidates, and trickled candidates were never exchanged.
- **One link per host**: `createWebRtcOffer()` called `closeRtc()`, closing every link; the offerer side was keyed `legacy`.
- **Broker cost**: every tab POSTed an announce and GET `/sessions` every 4 s (~1,800 calls/hour/tab); hosts polled for answers every 1.5 s with no end. One tab left open for a month would use most of the free tier.
- **Visiting used a fake realm**: `traverseChaosGatePortal()` built a placeholder delta instead of the host's real one.
- **Co-op was cosmetic**: combat packets only wrote a log line; every player fought a private copy of each monster.
- **Beacons** carried the full realm cartridge every 4 s; breadcrumbs were never sent; peers never expired.
- The deployed broker (`linked-pocket-realms-broker` repo, identical to `cloud-function/`) must keep working with the new client, because the broker is deployed separately and by hand.

## 3. Proposed Changes

### Transport (`transport.service.ts`)

- `PeerLink` per remote peer (`HOST` or `VISITOR` role), many links at once. Channel is any `ChannelLike` (RTCDataChannel in production, fakes in tests).
- Visitor-initiated handshake (works for many visitors): visitor makes a **join code** (offer), host replies with a **reply code** (answer). Tokens are v2 JSON with `from`/`to`, and are only produced after ICE gathering completes (4 s cap).
- Heartbeat `PING` every 5 s when idle; link closed after 20 s of silence; `connectionstatechange` failures reported with a plain message.
- Host relays visitors' public packets to its other visitors (dedupe by `packetId`). Visitors only talk to their host.
- Inbound validation: known type, size cap, string caps, per-link rate limit, and sender must match the link unless relayed by your host.
- `sendTo(peerId, packet)` for targeted packets (link first, BroadcastChannel fallback for same-browser tabs).
- Peers expire after 30 s without traffic (simulated Astral Echo exempt).

### Broker client (frugal)

- Hosting is **opt-in** ("Open my dungeon to visitors"), and only announces while the tab is visible, the player is at home, and they have been active in the last 15 minutes.
- Host heartbeat every 20 s. With the updated broker, the heartbeat response carries pending join requests (1 call); with the old broker, 1 extra GET.
- Visitor join: 1 POST plus polling every 3 s for at most 45 s.
- Lobby list fetched only when the network tab is open (every 30 s) or on refresh.
- Daily client cap (1,500 calls per browser) and backoff on 429/503.

### Broker (`cloud-function/index.js`, mirrored to the broker repo) — backward compatible

- Signals may carry `to`; `GET /signal?for=` filters them; `POST` with `sinceMs` returns pending signals (heartbeat = poll).
- Daily request ceiling (in memory) answering 503 with `Retry-After`.

### Host authority (`mud-engine.service.ts`)

- Packets: `VISITOR_HELLO`, `REALM_SNAPSHOT`, `ROOM_STATE`, `ACTION_DAMAGE`, `ACTION_TAKE`, `ACTION_RESULT`, `MONSTER_DEFEATED`, `HOST_AWAY`.
- Visitor enters a host's realm → hello → host sends its real delta + live room state → visitor builds the realm from it.
- Visitor hits: applied optimistically but never below 1 HP locally; host validates (link, monster alive, rate, damage cap), applies, and broadcasts room state; host decides kills and credits contributors.
- Visitor loot: requested from host; first request wins; item only enters inventory on approval.
- Host's own hits and kills are broadcast to visitors.
- Host only hosts its home realm; leaving home sends `HOST_AWAY` and visitors drop to an offline copy with a notice.
- Persistence: visitor kills update the host's live state but not the host's saved `RealmProgress` (ADR-013 stands).

### Presence

- `GATE_BEACON` every 10 s and on room change, without the cartridge, with the last few breadcrumbs.

### UI

- Network tab: plain connection status per link, join/reply code flow, hosting toggle, broker budget status, and the plain Wi-Fi/mobile note. Failure messages repeat the note.

## 4. Implementation Steps

- [x] Step 1: Models (packet types, payloads)
- [x] Step 2: Transport links, handshake, heartbeats, validation, relay, expiry
- [x] Step 3: Broker client frugality + budget guard; broker server changes (both repos)
- [x] Step 4: Engine authority (visitor + host paths), slim beacons, breadcrumbs
- [x] Step 5: UI updates and plain-language connectivity note
- [x] Step 6: Unit tests (fake channel pairs between two engines) and a two-browser Playwright test over real WebRTC
- [x] Step 7: Docs (ARCHITECTURE, ADR-014, ROADMAP TDs), quality gates, browser check

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (incl. `mesh-authority.spec.ts`: snapshot entry, host-decided kills with credit, damage clamp, contested loot, relay + spoof rejection, link loss, host leaving, peer expiry, broker cap, heartbeat handshake on updated and older broker)
- [x] Lint analysis passes: `npm run lint`
- [x] Formatting passes for changed files: `npm run format:check`
- [x] Multi-viewport E2E smoke tests pass: `npm run e2e`
- [x] Two-browser e2e: join/reply codes connect over real WebRTC; the host announces the visitor's kill and the visitor is rewarded
- [x] Lobby e2e through a local broker, against both the updated broker and the currently deployed version (unchanged copy from the broker repo)
- [x] Browser check of the network tab at desktop and phone width (no horizontal overflow, 44px controls)

## 6. Risks, Ceilings & Rollback

- **No TURN**: symmetric-NAT networks (many mobile carriers) will fail; stated in the UI.
- **Old broker**: works, but costs 2 calls per host heartbeat instead of 1 until the broker is redeployed.
- **Server daily ceiling is per instance and resets on cold start**; the real guarantee is client discipline plus `--max-instances=1`.
- **Rollback**: revert the commit; the broker changes are additive.

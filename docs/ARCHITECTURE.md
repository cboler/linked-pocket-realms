# System Architecture

This document describes how **Linked Pocket Realms** is built. The project started from the Angular PWA Starter; the static-hosting, PWA, and styling foundations below come from that starter and are still in force.

---

## 1. System Overview

The whole game runs in the player's browser. Static files come from GitHub Pages. An optional broker only helps peers find each other; it never runs game logic.

```
[ Browser tab ]
   │
   ├── Angular Service Worker ── caches the app shell for offline play
   │
   └── Angular app (single view, no routes)
         ├── App shell (app.ts/.html): HUD, room stage, skill bar, log, drawers, onboarding
         ├── MudEngineService ─── game state (signals), commands, 100 ms ATB loop
         │     ├── ChaosGateService ── seeded dungeon generation
         │     ├── StorageService ──── IndexedDB saves, cartridges, ECDSA signing
         │     ├── TransportService ── BroadcastChannel + WebRTC DataChannels
         │     ├── ThunderpassService ─ geohash proximity encounters
         │     ├── LegendRegistryService, SoundFxService
         │
         └── (optional) HTTPS ──> cloud-function broker
                                   ├── WebRTC offer/answer exchange (lobby)
                                   └── Thunderpass "spore" buckets keyed by blinded geohash
```

### Key Architectural Characteristics

- **Client-First Execution**: The game executes completely in the user's browser, enabling offline play and keeping player data on the device.
- **Static Hosting Optimized**: Built for GitHub Pages; URL fallback is handled client-side via `404.html`.
- **Repository-Name Independence**: No hardcoded hosting subpaths, so the build deploys to `https://<owner>.github.io/<repo>/` or a custom apex domain.
- **Deterministic World + Small Deltas**: A dungeon is regenerated from its address on every load. Only what changed is stored.

---

## 2. Technology Stack & Key Libraries

| Layer / Concern        | Technology / Library      | Purpose / Justification                                        |
| :--------------------- | :------------------------ | :------------------------------------------------------------- |
| **Framework**          | Angular (v22)             | Standalone components, `inject()` DI.                          |
| **Reactivity & State** | Angular Signals           | All game and UI state; RxJS only for the packet stream.        |
| **Persistence**        | IndexedDB (native)        | Key-value saves with an in-memory fallback for tests.          |
| **Networking**         | BroadcastChannel, WebRTC  | Same-browser tabs and peer-to-peer DataChannels.               |
| **Crypto**             | Web Crypto (ECDSA P-256)  | Signs boss drops ("Verified Drop").                            |
| **Audio**              | Web Audio API             | All sound is synthesized; no audio files.                      |
| **Offline & PWA**      | `@angular/service-worker` | Production asset caching, offline boot, and update checks.     |
| **Styling**            | Vanilla SCSS              | Design tokens via CSS custom properties; zero framework bloat. |
| **Unit Testing**       | Vitest (`jsdom`)          | Engine and component tests, run through `ng test`.             |
| **E2E Smoke Testing**  | Playwright                | One journey across phone, landscape, tablet, desktop.          |
| **Code Quality**       | Angular ESLint + Prettier | Automated linting and formatting compliance.                   |
| **Deployment**         | GitHub Actions            | Gates, build, and deploy to GitHub Pages.                      |
| **Broker (optional)**  | Node on Cloud Functions   | Free-tier signaling + proximity relay (`cloud-function/`).     |

There are no runtime dependencies beyond Angular, RxJS, and tslib.

---

## 3. Directory Layout & Boundaries

See the full map in `AGENTS.md`. In short:

- `src/app/core/` — models, services, config, and utilities. All game rules live here.
- `src/app/viewport/` — first-person stage and procedural SVG enemies.
- `src/app/hud/` — full dungeon map and the gate-dialing modal.
- `src/app/app.*` — the root shell, which still holds most of the HUD markup.
- `cloud-function/` — the optional broker, deployed separately (`deploy.sh` / `deploy.ps1`).

### Architectural Boundaries

1. **Engine (`core/services`)**: Owns game state and rules. Components read engine signals and dispatch `CommandIntent`s; typed terminal commands and HUD buttons produce the same intent ("dual-input parity").
2. **Generation (`ChaosGateService`)**: Pure and deterministic. Same address + same delta = same rooms.
3. **Persistence (`StorageService`)**: The only code that touches IndexedDB.
4. **Transport (`TransportService`)**: The only code that touches BroadcastChannel, WebRTC, or the broker. It hands the engine a stream of `NetworkPacket`s.
5. **Static Assets (`public/`)** and **Deployment Automation (`scripts/`)**: Unchanged from the starter.

### Known size ceilings

`mud-engine.service.ts` (~5,500 lines), `app.html` (~3,400), and `styles.scss` (~4,300) hold most of the game. They work, but they are the main cost of change. Splitting the engine into combat, movement/rooms, economy, and networking pieces is tracked in `docs/ROADMAP.md` (TD-04).

---

## 4. State Management & Reactivity

The application uses **Angular Signals** as its primary reactive primitive:

- **Local UI State**: Managed via writable signals (`signal<T>()`) inside components.
- **Derived Computations**: Managed via read-only computed signals (`computed(() => ...)`), ensuring deterministic recalculation only when dependencies change.
- **Side Effects**: Isolated in `effect(() => ...)` or explicit lifecycle methods, guarding against uncontrolled mutation loops.
- **Game loop**: `MudEngineService` runs a 100 ms `setInterval` for ATB gauges, cooldowns, and monster turns, and a 10 s presence beacon (local bus and direct links only). The transport owns its own timers: link heartbeats (5 s) and the opt-in lobby heartbeat (20 s).

### Signals vs. RxJS Decision Matrix

- **Use Signals for**:
  - Primitive state (booleans, counters, input values, active selections).
  - Synchronous derived state (filtered lists, computed totals).
  - Template binding and UI rendering.
- **Use RxJS for**:
  - Asynchronous event streaming with debouncing or throttling.
  - Multi-request race condition management (switchMap).
  - Angular Service Worker event subscriptions (`SwUpdate.versionUpdates`).
  - The incoming peer packet stream (`TransportService.packets$`), link events (`linkEvents$`), and departures (`peerGone$`).

---

## 5. World Generation & Persistence

### Generation

A dungeon address is an era letter plus three words, e.g. `Θ: Scorching Clockwork Catacombs`:

- **Era** (`Δ Θ Λ Σ Ω`) sets difficulty (level tier 1–20, stat multiplier 1.0–3.0).
- **Atmosphere** word sets the boosted element (e.g. Scorching → Fire).
- **Theme** word sets monster families, traps, and puzzles.
- **Biome** word sets the boss room.

The address is hashed into a Mulberry32 seed. `ChaosGateService.growRealmToStage()` builds the rooms for the realm's current growth stage (1–10) and applies the stored `RealmDelta` (custom rooms, overrides, grafted incursions).

### What is saved, and where

| Data                                              | Store          | Key                                                             | Shared with peers?                   |
| :------------------------------------------------ | :------------- | :-------------------------------------------------------------- | :----------------------------------- |
| Home realm delta (growth, custom rooms)           | IndexedDB      | `active_home_realm_delta`                                       | Yes, in `REALM_SNAPSHOT` to visitors |
| Any realm's last delta                            | IndexedDB      | `realm_delta:<address>`                                         | —                                    |
| Cleared monsters / collected items                | IndexedDB      | `realm_progress:<address>` (`RealmProgress`)                    | No                                   |
| Character (stats, inventory, current room)        | IndexedDB      | `player_character_state`                                        | No                                   |
| Combat/room telemetry, guestbook                  | IndexedDB      | `realm_telemetry_log`                                           | No                                   |
| Signing key pair                                  | IndexedDB      | `player_ecdsa_keypair`                                          | Public key only                      |
| Tab peer id                                       | sessionStorage | `linked_pocket_realms_tab_peer_id`                              | Yes (as sender id)                   |
| Preferences (mute, broker URL, echo bot, hosting) | localStorage   | `lpr_sound_muted`, `lpr_hosting_open`, `linked_pocket_realms_*` | No                                   |
| Broker calls today (budget guard)                 | localStorage   | `lpr_broker_calls`                                              | No                                   |
| Thunderpass encounter log                         | localStorage   | `thunderpass_streetpass_log_v1`                                 | No                                   |
| Astral Echo companion                             | IndexedDB      | `astral_echo_state` (`EchoCompanion`)                           | No (visitors see its presence only)  |

### Load order

1. The engine constructor generates a placeholder sanctum so the UI has something to draw.
2. `hydrateFromStorage()` loads the home delta, regenerates rooms, loads the character, then loads `RealmProgress` and marks cleared monsters as defeated and collected items as gone.
3. Placeholder log lines are dropped and the saved room is described.

Rules (also in `AGENTS.md`): any room change the player makes must be recorded so it survives regeneration, and saves go through `persistRealmDelta()` so visiting another realm never overwrites the home slot. See ADR-013.

---

## 6. Networking

### Shape: a star around each realm owner

The realm owner's browser is the **host** and the authority for its realm (ADR-014). Visitors connect directly to the host; the host forwards public chatter (chat, presence, inscriptions, gravestones) between its visitors. Visitors never talk to each other directly. A host can hold up to 8 visitor links at once, and a player can host their own realm while visiting one other host.

```
        Visitor A ──┐
                    ├── Host (realm owner) ── decides HP, kills, loot
        Visitor B ──┘        │
                             └── relays public packets A ⇄ B
```

### Transports

- **BroadcastChannel** (`linked_pocket_realms_chaos_gate_bus_v1`): instant linking between tabs in the same browser (they share one save, so this is mainly for testing).
- **WebRTC DataChannels**: browser-to-browser links. The **visitor** creates a join code (offer); the **host** answers with a reply code. Codes are made only after ICE gathering finishes (4 s cap), so they carry the network addresses; no trickle ICE is needed. STUN only (`stun.l.google.com`). **There is no TURN relay**, so symmetric-NAT networks (many mobile carriers, some school/office networks) will fail; the UI says so (`CONNECTIVITY_NOTE`).
- **Broker** (`cloud-function/index.js`, deployed from the `linked-pocket-realms-broker` repo): lobby list, a per-lobby signal mailbox, and Thunderpass spore buckets. Optional: join and reply codes work without it.

### Link lifecycle (`TransportService`)

- `PING` every 5 s on an idle link; a link with no traffic for 20 s is closed. A link that doesn't open within 30 s of the handshake fails with the connectivity note.
- Links made through the lobby rejoin automatically (5 s, 15 s, 45 s) if they drop unexpectedly.
- Inbound packets are checked (`sanitizeIncomingPacket`): known type, 64 KB cap, string caps, per-link rate limit (20/s, burst 40). A packet's sender must match its link, unless it arrived from my host as a relayed public packet (`relayedBy` is set locally, never trusted from the wire). Duplicates are dropped by `packetId`.
- `sendTo(peerId)` targets one peer (link, else same-browser bus, else via my host). Receivers ignore packets whose `toPeerId` isn't theirs.
- Peers not heard from for 30 s are dropped from `discoveredPeers` (the simulated Astral Echo is exempt).

### Broker budget (free tier: 2M requests/month across all players)

| Activity                            | Calls                                                                                                                                                                                                  |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting (opt-in "Open to visitors") | 1 per 20 s heartbeat with the updated broker (heartbeat returns pending join requests); 2 with the older broker. Only while at home, the tab is visible, and the player was active in the last 15 min. |
| Joining a lobby host                | 1 POST, then 1 poll every 3 s for at most 45 s                                                                                                                                                         |
| Browsing the lobby                  | Only while the network tab is open: 1 per 30 s                                                                                                                                                         |
| Startup                             | None                                                                                                                                                                                                   |
| Thunderpass walk mode               | 1 per map-cell change                                                                                                                                                                                  |

Guards: a per-browser cap of 1,500 broker calls per day (`reserveBrokerCall()`, shared by Thunderpass), back-off on `429`/`503` with `Retry-After`, and a server-side daily ceiling of 55,000 requests (in memory, per instance) that answers `503`. Rough sizing: an active hosting tab costs ~180 calls/hour, so the free tier covers about 11,000 hosting-hours a month.

### Host authority protocol

| Packet                          | Direction     | Meaning                                                                                                                                |
| :------------------------------ | :------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| `VISITOR_HELLO`                 | V → H         | "Let me in." Sent automatically when a link to a host opens.                                                                           |
| `REALM_SNAPSHOT`                | H → V         | The host's real `RealmDelta` plus live HP and floor items for every room. Re-sent to all visitors when the realm grows or is reshaped. |
| `ROOM_STATE`                    | H → all       | One room's live HP and items after any change.                                                                                         |
| `ACTION_DAMAGE`                 | V → H         | A visitor's hit. The host checks the visitor is registered, rate-limits (300 ms), clamps damage (`maxVisitorHit`), and applies it.     |
| `MONSTER_DEFEATED`              | H → all       | The host decided a kill. Everyone listed in `creditPeerIds` (all who damaged it) gets rewards.                                         |
| `ACTION_TAKE` / `ACTION_RESULT` | V → H / H → V | Loot requests; first request wins; the item enters the visitor's inventory only on approval.                                           |
| `VISITOR_LEAVE`, `HOST_AWAY`    | either        | Visitor left; host left home (visitors drop to an offline copy).                                                                       |

On the visitor side, hits apply locally at once but never take a monster below 1 HP until the host confirms. If the link drops or the host leaves home, the visitor keeps playing an **offline copy** (built from the address); kills and loot there are only theirs, and the log says so.

### Presence

`GATE_BEACON` is sent every 10 s and on every room change. It carries name, class, level, current realm and room, and the last 5 movement breadcrumbs (ghost trails, shown only in the realm they were walked in). It no longer carries the realm cartridge; realm data travels only in `REALM_SNAPSHOT`.

### Visiting another realm

With a live link, the host's snapshot builds the realm (`authorityHost` is set). Without one, `visitOfflineCopy()` builds the realm from the address with a guest ruleset. Either way the Customs Gate scales down over-budget gear for the visit, and returning home reloads the saved home delta.

### Simulated presence

- **Astral Echo**: your companion, drawn in its room like another traveler (see section 6a). While you host, visitors see it through a companion presence beacon the host relays.
- **Phantom trails**: breadcrumbs from presence beacons, drawn as ghosts in the viewport.

---

## 6a. Respawns, Sealed Chests, the Astral Echo, and Revival (ADR-015)

### Respawns and drops

`RealmProgress.defeatedAt` stores when each monster fell. `withRealmProgress()` treats a monster as dead only within its cooldown (60 min; bosses 24 h); `respawnDueMonsters()` runs every minute and restores expired monsters from a pristine copy captured when rooms were generated, skipping the room you're in. Regular kills roll a seeded drop (`rollMonsterDrop()`): 25% an item, 10% a lockpick.

### Sealed chests

`ChaosGateService.addLockedChests()` adds seeded chests to generated rooms. `CHEST_SEAL_RULES` lists which classes open each seal and what it costs; `lockpickChance()` sets the odds. `MudEngineService.openChest()` checks the rules, spends stamina or risks a pick, and puts the loot on the floor. Opened chests are saved (`openedChestKeys`). In a hosted realm, `ACTION_OPEN_CHEST` asks the host, which checks the visitor's class.

### The Astral Echo

- `astral-echo.ts` holds the pure simulation: `createEcho()`, `stepEcho()` (movement by shortest path, jobs, fights, loot, chests, resting, going down, leveling, proficiency, knowledge), and `makeRouteJob()`. Tuning is in `ECHO_TUNING`.
- `MudEngineService.advanceEcho()` runs one live step every 2 s while you're home; after a longer gap (closed tab, throttled tab, coming back from a visit) it simulates up to 8 hours in 30 s steps, letting rooms refill at simulated times, and shows a report. `applyEchoEffects()` applies its kills, pickups, chest openings, and scouting through the normal paths.
- It appears via `localEchoPeer` in `peersInCurrentRoom` (which now also matches the realm, not just the room id). Talk opens the **Echo** tab in the Play Together drawer. Commands: `echo on | off | status | follow | scout | farm | route <name> | stop | watch | done <name> | give | lockpick | carry | name <new>`.
- It never calls the network; while hosting, its presence goes to visitors over direct links only.

### Falling and revival

`afterPlayerFell()` decides what happens when you fall: carried to the nearest campfire by your Echo, left down for others to carry (3-minute wait; monsters ignore you), or straight to the entrance if nobody can help. `playerDowned` holds the state and the campfire prompt (`acceptCampfireRevival()` / `respawnAtEntrance()`). Carrying another player sends `CARRY_START`; their client follows the carrier's presence beacons and shows the prompt at a campfire. A carried Echo revives on arrival at a campfire, or by resting there.

---

## 7. Routing & Static Hosting Mechanics

`app.routes.ts` is currently empty: the game is one view, and share links use query parameters (`?spore=...`) on the root URL. The router and the GitHub Pages fallback are kept so deep links and any future routes keep working.

GitHub Pages is a static file host that does not provide native URL rewrite rules for client-side routing. Navigating directly or refreshing on a route normally produces an HTTP 404 error. The build hook solves this:

```
[ Direct Route Request: /some-route ]
               │
               ▼
   [ GitHub Pages Server ]
               │ (File /some-route/index.html does not exist)
               ▼
       [ Serves 404.html ]  <── Generated by scripts/prepare-pages.mjs
               │                (contains Angular bundle + <base href>)
               ▼
      [ Browser Executes App ]
               │
               ▼
     [ Angular Router Activates ]
```

### Subpath Independence

The GitHub Actions workflow uses `actions/configure-pages` to dynamically inject the `--base-href`:

- Root user sites (`https://<user>.github.io/`) receive `--base-href /`.
- Project subpath sites (`https://<user>.github.io/<repo>/`) receive `--base-href /<repo>/`.

No hardcoded URLs exist in the source code.

---

## 8. PWA & Offline Strategy

Offline capabilities are governed by `@angular/service-worker` through `ngsw-config.json`:

1. **App Shell Asset Group (`prefetch`)**: `index.html`, `favicon.ico`, the manifest, and all compiled JS/CSS bundles, cached on install so the game boots without internet access.
2. **Assets Group (`lazy`)**: images, icons, and fonts, cached when first requested.
3. **Dynamic Data Groups**: none. Broker calls are live network requests and are not cached; solo play needs no network at all.

---

## 9. Styling, Layout & Mobile-First Foundation

The application uses **Vanilla SCSS** structured around CSS Custom Properties (`src/styles.scss`, plus component SCSS for the viewport and enemies):

- **Breakpoints in use**: base styles target phones; `max-width: 599px` tightens phones; `640px`, `768px`, `900px`, and `960px` enhance tablet and desktop; `max-height: 500px` handles phone landscape (room view on the left, controls and log on the right).
- **Room stage**: on desktop the first-person view and the info column sit side by side. The minimap is a card at the top of the info column (and after the room cards on phones); it never overlays the 3D view.
- **Touch Target Ergonomics**: `--touch-target-min: 44px`, enforced as a floor for `(pointer: coarse)` and widths under 600px. Keyboard hint labels (`.hotkey-hint`) are hidden on touch screens.
- **Safe Area Insets**: Handled via `env(safe-area-inset-top/bottom/left/right)`.
- **Accessibility Baseline**: Focus visibility (`:focus-visible`), readable contrast ratios, and `prefers-reduced-motion` compliance are built into the core stylesheet.
- **No Accidental Horizontal Overflow**: Containers use flexbox/grid with fluid max-widths to guarantee zero horizontal scrollbars.

---

## 10. Testing & Quality Strategy

Quality gates run locally and in GitHub Actions (`ci.yml` on pushes to non-`main` branches and PRs into `main`; `deploy.yml` runs the same gates on `main` before publishing):

```
npm run format:check ──> Prettier verifies code formatting
npm run lint         ──> Angular ESLint verifies code style & best practices
npm test             ──> Vitest runs unit suites in headless JSDOM
npm run build        ──> Angular build checks budgets & compile errors
npm run e2e          ──> Playwright runs the journey on phone portrait/landscape, tablet, desktop
```

- `src/app/app.spec.ts` holds most engine and HUD tests. Newer, focused suites sit next to their code (for example `realm-persistence.spec.ts`).
- Engine tests create a second `MudEngineService` on the same `StorageService` to simulate a page reload.
- Multiplayer unit tests (`mesh-authority.spec.ts`) give each simulated player its own injector (storage, transport, engine) and connect them with in-memory channel pairs.
- `e2e/multiplayer.spec.ts` (Playwright project `multiplayer`) connects two browser contexts over real WebRTC with join/reply codes. Its lobby test runs only when `LPR_TEST_BROKER_URL` points at a local broker, so CI never calls the live one.

---

## 11. Extension Guide

When adding features:

1. **Feature Directory Structure**: Put new UI in its own folder (`src/app/<area>/<feature>/`) with component, styles, and tests colocated, rather than growing `app.html` further.
2. **Core Services**: Place shared singleton services (storage, sound, sensors, API clients) in `src/app/core/services/`.
3. **Domain Models**: Place pure TypeScript interfaces and types in `src/app/core/models/`.
4. **Preserve Deployment Hooks**: Do not alter `scripts/prepare-pages.mjs` or the base-href injection in `.github/workflows/deploy.yml` unless migrating to a different hosting platform.
5. **Update Documentation**: Maintain `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` as the game and architecture evolve.

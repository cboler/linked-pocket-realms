# AGENTS.md

These instructions apply to this repository. It was derived from the Angular PWA Starter template, and the starter's operating rules (below) still apply in full.

## Repository Overview

- **Product**: Linked Pocket Realms — a browser dungeon crawler (a "MUD") where every player's browser holds their own procedurally generated dungeon. Players explore, fight in real-time ATB combat, grow their dungeon, and visit each other's dungeons over peer-to-peer links.
- **Live site**: <https://cboler.github.io/linked-pocket-realms/>
- **Framework**: Angular 22 (standalone components, `inject()`-based DI, Angular Signals for state).
- **Hosting**: Static GitHub Pages build (`.github/workflows/deploy.yml`) with a dynamic `--base-href`, the `404.html` SPA fallback (`scripts/prepare-pages.mjs`), and the Angular Service Worker (`ngsw-config.json`).
- **Server pieces**: None required to play solo. An optional, free-tier Google Cloud broker (`cloud-function/`) helps peers find each other (WebRTC signaling) and powers Thunderpass proximity matching. The game itself never runs on a server.
- **Architecture details**: see `docs/ARCHITECTURE.md`.

---

## Map of Code

```
linked-pocket-realms/
├── .github/workflows/        # ci.yml (format, lint, test, build, e2e), deploy.yml (same gates + GitHub Pages), gitleaks.yml
├── cloud-function/           # Optional WebRTC signaling + Thunderpass broker (Node, Cloud Functions Gen 2)
├── docs/                     # Architecture, ADRs, roadmap, execution plans
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── ROADMAP.md
│   └── exec-plans/{active,completed}/
├── e2e/
│   ├── smoke.spec.ts         # Playwright journey across phone portrait/landscape, tablet, desktop
│   ├── multiplayer.spec.ts   # Two browsers over real WebRTC (project `multiplayer`)
│   └── echo.spec.ts          # Wake the Astral Echo, talk to it, send it scouting
├── public/                   # manifest.webmanifest, favicon, PWA icons
├── scripts/
│   ├── prepare-pages.mjs     # Generates 404.html SPA fallback for GitHub Pages
│   └── test-broker-live.mjs  # Live smoke test against a deployed broker (npm run test:broker)
├── src/
│   ├── app/
│   │   ├── app.ts / .html    # Root HUD shell: header, room stage, skill bar, log, drawers, onboarding
│   │   ├── app.config.ts     # Providers (router, service worker, global error listeners)
│   │   ├── app.routes.ts     # Empty: the game is a single view
│   │   ├── app.spec.ts       # Main unit/integration suite (most engine behavior is tested here)
│   │   ├── core/
│   │   │   ├── config/runtime.config.ts      # Default broker URL (stamped by cloud-function deploy scripts)
│   │   │   ├── models/domain.models.ts       # All domain types (rooms, items, realm deltas, packets...)
│   │   │   ├── services/
│   │   │   │   ├── mud-engine.service.ts     # Game engine: commands, ATB combat, movement, loot, chests, respawns, Echo wiring, P2P
│   │   │   │   ├── astral-echo.ts            # Pure Astral Echo simulation (jobs, fights, catch-up) and tuning
│   │   │   │   ├── chaos-gate.service.ts     # Seeded (Mulberry32) dungeon generation from 3-word addresses
│   │   │   │   ├── storage.service.ts        # IndexedDB key-value store, cartridges, ECDSA signing, Customs Gate clamp
│   │   │   │   ├── transport.service.ts      # Links (star mesh), handshake codes, validation, frugal broker client
│   │   │   │   ├── thunderpass.service.ts    # Geohash proximity "StreetPass" encounters
│   │   │   │   ├── legend-registry.service.ts# Shared map legend glyphs + per-realm custom symbols
│   │   │   │   ├── sound-fx.service.ts       # Synthesized Web Audio effects
│   │   │   │   ├── realm-persistence.spec.ts # Reload/visit persistence tests
│   │   │   │   ├── mesh-authority.spec.ts    # Host authority, relay, link loss, broker budget, carry, chest-via-host tests
│   │   │   │   └── echo-and-chests.spec.ts   # Respawns, drops, sealed chests, Echo jobs/catch-up/revival tests
│   │   │   └── utils/qr-code.util.ts         # Dependency-free SVG QR generator
│   │   ├── hud/
│   │   │   ├── node-map-graph/               # Full SVG dungeon map
│   │   │   └── resonance-loom-modal/         # Gate dialing / splicing modal
│   │   └── viewport/
│   │       ├── first-person-stage.*          # 2.5D first-person room view
│   │       └── enemy-sprite/                 # Procedural SVG enemies
│   ├── index.html
│   ├── main.ts
│   └── styles.scss           # Global design tokens and most HUD styling
├── angular.json
├── ngsw-config.json
└── package.json
```

---

## Commands & Quality Gates

Prerequisites: Node.js 22+ and npm 10+.

```bash
# Install dependencies reproducibly from lockfile
npm ci

# Start local development server with auto-reload (http://localhost:4200/)
npm start

# Run unit tests via Vitest (headless, single run)
npm test

# Run ESLint static analysis
npm run lint

# Check and fix formatting with Prettier
npm run format
npm run format:check

# Production build and GitHub Pages deployment preparation
npm run build
npm run build:pages

# Run Playwright multi-viewport smoke tests (mobile, tablet, desktop)
npm run e2e

# Optional: live test against the deployed broker (needs network access)
npm run test:broker

# Multiplayer e2e only (two browsers over real WebRTC). Add a local broker for the lobby test:
npx playwright test --project=multiplayer
LPR_TEST_BROKER_URL=http://localhost:8080 npx playwright test --project=multiplayer
```

---

## Agent Workflow & Documentation System

When planning and implementing changes, follow this structured documentation cycle:

1. **Consult Architecture**: Review `docs/ARCHITECTURE.md` to understand system boundaries, state management patterns, and static hosting mechanics.
2. **Consult & Record Decisions**: Check `docs/DECISIONS.md` before proposing architectural pivots. Record new non-trivial architectural choices as ADRs.
3. **Check & Update Roadmap**: Refer to `docs/ROADMAP.md` for project milestones and the technical debt backlog. Update item status when features land.
4. **Execution Plans for Non-Trivial Tasks**: For multi-step features, architectural refactoring, or risky changes:
   - Create a plan in `docs/exec-plans/active/YYYY-MM-DD-<slug>.md` using the template defined in `docs/exec-plans/active/README.md`.
   - Implement step-by-step, validating against automated tests and real browser rendering.
   - Once verified and complete, move the plan to `docs/exec-plans/completed/`.
5. **Quality Gate Verification**: Never declare work complete without executing `npm test`, `npm run lint`, `npm run format:check`, and testing locally in a browser.

---

## Guardrails & Invariants

All agents and contributors must preserve the following principles:

### 1. PWA & Static Hosting Integrity

- **Subpath Independence**: Keep the application deployable from subpaths (`https://<owner>.github.io/<repo>/`) as well as root domains (`https://example.com/`). Never hardcode root-relative asset paths or router links (`/` instead of `./` or router link tokens).
- **SPA Fallback Preservation**: Never delete or bypass `scripts/prepare-pages.mjs`. Static hosts like GitHub Pages require `404.html` containing the Angular application bundle to support direct client-side route navigation and browser refresh.
- **Service Worker Lifecycle**: Preserve `@angular/service-worker` in `src/app/app.config.ts` and `ngsw-config.json`. Do not disable service worker caching in production builds.

### 2. Mobile-First & Accessibility Baseline

- **Mobile-First CSS**: Write base styles for narrow viewports first; use `@media (min-width: ...)` breakpoints to enhance tablet and desktop layouts.
- **Touch Target Sizing**: Ensure all buttons, links, and interactive controls maintain a minimum target size of 44x44px (`--touch-target-min`). `src/styles.scss` enforces this floor for touch screens and windows under 600px wide.
- **Safe Area Insets**: Support notched displays using CSS `env(safe-area-inset-top/bottom/left/right)`.
- **Keyboard & Focus States**: Retain accessible `:focus-visible` outlines (`--focus-ring`). Never suppress focus rings with `outline: none` without providing an accessible alternative.
- **Zero Horizontal Scroll**: Prevent accidental horizontal layout overflow across phone portrait, phone landscape, tablet, and desktop viewports.
- **Never Cover the Game View**: Overlays (minimap, badges, panels) must not sit on top of the first-person viewport. Put them in the info column or behind a toggle.

### 3. YAGNI & Minimal Complexity

- **Native Standards First**: Use native browser Web APIs, standard HTML elements, and CSS custom properties before adding third-party libraries.
- **Angular Built-in Primitives**: Prefer Angular Signals (`signal()`, `computed()`) for reactive state and native control flow (`@if`, `@for`) over heavyweight state management libraries or unnecessary RxJS ceremony.
- **No Unrequested Boilerplate**: Keep components and services focused on their explicit purpose. Avoid speculative abstractions.

### 4. Game State & Persistence

- **Anything the player changes must survive a reload.** Rooms are regenerated from the seed on every load, so any change to a room (defeated monsters, collected items) must be stored and reapplied. Per-player progress lives in `RealmProgress` (never shared with peers); shared dungeon changes live in `RealmDelta`.
- **Visiting never overwrites home.** Save realm deltas through the engine's `persistRealmDelta()`, which only writes the home-realm slot when the player is not visiting someone else's realm.

### 5. Multiplayer & Free-Tier Broker

- **The realm owner is the authority** (ADR-014). Anything that changes shared realm state during a visit (HP, kills, loot) must be a request to the host, decided by the host. Visitors never apply it on their own.
- **Never call the broker on a timer that isn't opt-in, visible, and capped.** All broker requests go through `TransportService.brokerFetch()` / `reserveBrokerCall()` (per-browser daily cap). No calls at startup; the lobby list is fetched only while it is on screen. Keep the free tier (2M requests/month total) far away.
- **Broker changes must stay backward compatible** with the deployed broker, and be mirrored to the `linked-pocket-realms-broker` repo. Tests must never call the live broker.
- **Be honest about connectivity**: there is no TURN relay. Keep `CONNECTIVITY_NOTE` visible where connections are offered and in failure messages.

### 6. Plain Language in the UI

- New player-facing text should use plain words first ("dungeon", "difficulty", "greeting"). Invented lore terms (Chaos Gate, Tri-Chord, Customs Gate, Herald) can stay in code identifiers and flavor text, but should not be the only explanation a new player sees.

### 7. Derivation History

- This repo was created from the Angular PWA Starter: the placeholder `home/` and `status/` views have been replaced by the game HUD, and `index.html` plus `manifest.webmanifest` are rebranded. The PWA icons in `public/icons/` are still the starter's defaults (see `docs/ROADMAP.md`).
- Keep `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` in step with the code while retaining the core operational rules above.

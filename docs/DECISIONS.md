# Architectural Decisions

This document records the architectural decision records (ADRs) for this project.

Each record outlines the context, rationale, consequences, and trade-offs of significant architectural decisions made in the codebase. Downstream projects derived from this starter should append their domain decisions to this log.

---

## Decision Index

- [ADR-001: Angular Standalone Components and Signals Architecture](#adr-001-angular-standalone-components-and-signals-architecture)
- [ADR-002: GitHub Pages Static Hosting with Dynamic Base Href and 404 Fallback](#adr-002-github-pages-static-hosting-with-dynamic-base-href-and-404-fallback)
- [ADR-003: Vitest for Unit Testing and Playwright for Multi-Viewport E2E Testing](#adr-003-vitest-for-unit-testing-and-playwright-for-multi-viewport-e2e-testing)
- [ADR-004: Vanilla SCSS Design Tokens over External CSS Frameworks](#adr-004-vanilla-scss-design-tokens-over-external-css-frameworks)
- [ADR-005: Built-in Angular Service Worker for Offline PWA Support](#adr-005-built-in-angular-service-worker-for-offline-pwa-support)
- [ADR-006: 1st-Person Perspective Viewport, Overgrowth Grafting, gcloud WebRTC Broker, and Privacy-Preserving Thunderpass](#adr-006-1st-person-perspective-viewport-overgrowth-grafting-gcloud-webrtc-broker-and-privacy-preserving-thunderpass)
- [ADR-007: Etrian Odyssey-Style Vector SVG Enemy Representations with Dynamic Adjective Mutators](#adr-007-etrian-odyssey-style-vector-svg-enemy-representations-with-dynamic-adjective-mutators)

---

## ADR-001: Angular Standalone Components and Signals Architecture

### Status

Accepted

### Context

Legacy Angular applications relied heavily on `NgModule` containers and required complex state management libraries (NgRx, Akita) or extensive RxJS boilerplate for standard component state. Modern Angular provides standalone components, direct provider injection, and Angular Signals.

### Decision

- Use Angular standalone components exclusively (`standalone: true` default in modern Angular).
- Use Angular Signals (`signal()`, `computed()`, `effect()`) for synchronous UI state and reactivity.
- Reserve RxJS for streaming asynchronous events, debouncing, and cancellation scenarios.

### Consequences

- **Positive**: Dramatically less boilerplate, faster build times, tree-shakable components, and clearer mental model for state updates.
- **Trade-off**: Requires developers accustomed to NgModules or heavy state stores to adopt Angular's native modern patterns.

---

## ADR-002: GitHub Pages Static Hosting with Dynamic Base Href and 404 Fallback

### Status

Accepted

### Context

GitHub Pages is a cost-effective, zero-maintenance static host for web applications. However, it presents two challenges for modern single-page applications:

1. Projects are often hosted at subpaths (`https://<owner>.github.io/<repo>/`) rather than the domain root.
2. Static file servers return a 404 error when users reload or directly navigate to client-side routes (e.g. `/status`).

### Decision

- Dynamically inject the repository's base path during GitHub Actions deployment using `@actions/configure-pages`.
- Generate a `404.html` SPA fallback by copying `dist/.../browser/index.html` via `scripts/prepare-pages.mjs` during the build step.
- When GitHub Pages encounters a direct route, it serves `404.html` containing the Angular application bundle and correct `<base href>`, enabling Angular Router to initialize and display the requested route.

### Consequences

- **Positive**: Complete repository-name independence; zero configuration required when creating a new repo; client-side routing works reliably on refresh.
- **Trade-off**: Direct route navigation briefly returns an HTTP 404 status code behind the scenes before serving the SPA shell. For static PWAs on GitHub Pages, this is standard and harmless.

---

## ADR-003: Vitest for Unit Testing and Playwright for Multi-Viewport E2E Testing

### Status

Accepted

### Context

Traditional Angular testing setups used Karma and Protractor (or heavy headless Chrome runners), leading to slow feedback loops and deprecated toolchains. A mobile-first PWA also requires validating rendering across physical device viewports to ensure no horizontal overflow or touch-target degradation occurs.

### Decision

- Use **Vitest** with JSDOM for fast, in-process unit tests (`npm test`).
- Use **Playwright** (`npm run e2e`) for automated end-to-end smoke testing across mobile portrait (375x667), mobile landscape (667x375), tablet (768x1024), and desktop (1280x800) viewports.

### Consequences

- **Positive**: Near-instant unit test execution; robust visual and functional validation across real browser engines (Chromium, WebKit, Firefox).
- **Trade-off**: Requires maintaining both a lightweight unit test runner and a browser-driven E2E runner.

---

## ADR-004: Vanilla SCSS Design Tokens over External CSS Frameworks

### Status

Accepted

### Context

Many starters bundle large CSS utility frameworks (Tailwind, Bootstrap) that increase bundle weight, add build complexity, and impose opinionated styling abstractions that downstream projects often fight or replace.

### Decision

- Use vanilla SCSS structured with CSS Custom Properties (`src/styles.scss`) for color palette, spacing, typography, radii, and touch-target minimums.
- Rely on native modern CSS features: flexbox, grid, `:focus-visible`, `env(safe-area-inset-*)`, and `@media (prefers-reduced-motion)`.

### Consequences

- **Positive**: Zero CSS runtime overhead, tiny bundle sizes, complete freedom for downstream applications, and native browser standards compliance.
- **Trade-off**: Requires writing semantic CSS rather than utility classes in HTML templates.

---

## ADR-005: Built-in Angular Service Worker for Offline PWA Support

### Status

Accepted

### Context

Progressive Web Applications require service workers to cache application assets and enable offline startup. Hand-crafting custom service workers introduces high maintenance overhead, cache-invalidation bugs, and manual versioning complexity.

### Decision

- Use `@angular/service-worker` configured via `ngsw-config.json`.
- Configure `appConfig` in `src/app/app.config.ts` to register the service worker when stable in production mode.
- Use the `prefetch` asset group for the app shell and the `lazy` group for secondary assets.

### Consequences

- **Positive**: Robust, hash-based asset cache invalidation; automatic background updates; official Angular tooling support.
- **Trade-off**: Custom service worker logic (like Web Push or complex background sync) requires using extension hooks or integrating with Angular's service worker APIs.

---

## ADR-006: 1st-Person Perspective Viewport, Overgrowth Grafting, gcloud WebRTC Broker, and Privacy-Preserving Thunderpass

### Status

Accepted

### Context

Linked Pocket Realms was originally explored through a pure 2D topological cartography map and text MUD narrative. Players required greater spatial immersion (visual doorways, chamber depth, enemy silhouettes, and tactile forward/turn navigation) without compromising the lightweight declarative room graph or offline PWA capabilities. Furthermore, peer-to-peer multiplayer needed persistent offline aftermath ("Overgrowth" incursion rooms) and effortless zero-configuration rendezvous, including physical 3DS StreetPass-style proximity collisions on real-world walks ("Thunderpass").

### Decision

1. **First-Person Dungeon Viewport (`FirstPersonStageComponent`)**:
   - Render perspective chambers (ceiling, floor, left/right/back walls) dynamically themed and lit by room Tri-Chords using lightweight declarative SVG projection.
   - Maintain client state `playerFacing: 'N' | 'E' | 'S' | 'W'` with 90° rotation and forward navigation.
   - Project spatial exits (ahead, left, right) and interactive room entities (monsters, chests, traveler echoes) that dispatch identical `CommandIntent` payloads as the terminal parser.
2. **Persistent Overgrowth Grafting & Pruning**:
   - P2P realm collisions deterministically splice Tri-Chord seeds (`Hash(LocalSeed ^ RemoteSeed)`) to graft 2-3 hybrid Overgrowth rooms onto outer boundaries.
   - Overgrowth rooms persist across disconnects in local IndexedDB until defeated guardians allow `@prune` commands to collapse the rooms and harvest Resonance Shards.
3. **Serverless gcloud Broker & Thunderpass**:
   - Deploy a lightweight zero-cost-tier Gen 2 Cloud Function supporting in-memory WebRTC signaling (5-min TTL) and zero-knowledge geohash proximity spore matching (6-hour TTL).
   - Compute blinded precision-6/7 geohashes on the client via `SubtleCrypto` (`SHA-256(geohash + window + salt)`) so raw GPS coordinates never leave the device, supported by screen WakeLock and optional BLE scanning.

### Consequences

- **Positive**: Rich first-person dungeon crawler immersion while preserving the core lightweight MUD engine; permanent playable world-blending upon collisions; effortless WebRTC lobby discovery and passive proximity gameplay.
- **Trade-offs**: Geolocation requires user permission for active walk mode; WakeLock requires active foreground browser tab (mitigated with battery-saver pocket overlay).

---

## ADR-007: Etrian Odyssey-Style Vector SVG Enemy Representations with Dynamic Adjective Mutators

### Status

Accepted

### Context

Previously, enemies in the 2.5D perspective dungeon viewport (`FirstPersonStageComponent`) were depicted as a single generic dark polygon silhouette with a red center dot, regardless of theme, creature family, or atmospheric adjectives. This lacked visual variety and tactical readability characteristic of dungeon crawlers like Etrian Odyssey. Heavy bitmap sprites or canvas libraries would bloat the bundle and compromise the zero-dependency, static PWA hosting model.

### Decision

1. **Modular Vector SVG Silhouettes**:
   - Implemented `EnemySpriteComponent` rendering 43 distinct anatomical vector silhouettes spanning all 8 structural themes (32 regular creature species), 8 biome boss titans, Conjunction incursions, and Overgrowth guardians.
2. **Dynamic Adjective Mutators & Particle Systems**:
   - Implemented `EnemyVisualResolver` mapping atmospheric adjectives (`Scorching`, `Crystalline`, `Tempestuous`, `Abyssal`, `Blighted`, `Aetherial`, `Gilded`, `Silent`), anomaly prefixes (`Void-Warped`, `Chrono-Fractured`, `Cataclysmic`, `Prismatic`, `Sub-Zero`, `Magnetic`), and active combat statuses (`Burn`, `Chill`, `Sunder`, `Overcharge`, `Silenced`) directly into dynamic color palettes, threat auras, and animated SVG overlays (rising embers, frost shards, lightning arcs, void tendrils, spore vesicles, spinning cogs, and celestial halos).
3. **Tactile Readability & Reduced-Motion Baseline**:
   - Added color-coded tactical adjective pills below health/ATB bars for instant combo planning.
   - All CSS/SVG keyframe animations (idle breathing, cog spins, particle drift) gracefully disable under `@media (prefers-reduced-motion: reduce)` while preserving distinct visual colors and shapes.

### Consequences

- **Positive**: Each enemy type is visually unique and instantly recognizable; procedural adjectives directly transform creature appearances; zero raster asset footprint (< 20KB total); native SVG hardware acceleration across mobile, tablet, and desktop viewports.
- **Trade-offs**: Complex SVG paths require careful coordinate budgeting within the 140x180 viewBox cell; mitigated through modular templates and unit tests.

---

When recording a new architectural decision, copy and fill out the following template:

```markdown
## ADR-###: [Short Title]

### Status

[Proposed | Accepted | Superseded | Deprecated]

### Context

[What problem are we trying to solve? What constraints exist?]

### Decision

[What is the change or technical choice being made?]

### Consequences

- **Positive**: [What benefits does this decision bring?]
- **Trade-offs**: [What drawbacks, limitations, or maintenance costs are accepted?]
```

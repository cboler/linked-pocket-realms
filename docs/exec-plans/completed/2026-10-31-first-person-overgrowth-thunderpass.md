# Execution Plan: 1st-Person Viewport, Overgrowth Grafting, gcloud Broker & Thunderpass

- **Date**: 2026-10-31
- **Status**: Completed
- **Owner**: Antigravity Agent

## 1. Goal & Objectives

Evolve the **Linked Pocket Realms** engine with four intertwined systems while preserving the declarative MUD engine, terminal log, and 2D node cartography:

1. **Spliced Lore & Terminology**: Standardize on **Resonance Loom**, **Tri-Chord Lexicon**, **Incursion / Overgrowth**, and **Pruning (`@prune`)** with **Resonance Shards** currency.
2. **First-Person Dungeon Crawler Viewport (`FirstPersonStageComponent`)**: Render a perspective 2.5D/3D dungeon-crawler chamber above the Narrative Terminal Log with spatial doorways, visual entity silhouettes, floating ATB/HP gauges, and directional movement (`playerFacing` signal + dual tactile/keyboard inputs).
3. **P2P Realm Grafting, Persistent "Overgrowth" & Pruning**: Colliding with remote realms splices both Tri-Chords to deterministically graft 2-3 hybrid Overgrowth rooms onto the local dungeon graph that persist in IndexedDB across disconnects until cleared and pruned for Resonance Shards.
4. **Serverless `gcloud` Signaling Broker & "Thunderpass" (StreetPass Proximity Mode)**: Provide a lightweight Gen 2 Google Cloud Function broker with WebRTC signaling + zero-knowledge geohash proximity relay, coupled with a client `ThunderpassService` (privacy blinding, wake lock, battery saver overlay, BLE relic scanning, and Traveler's Echo encounters).

## 2. Context & Background

Linked Pocket Realms currently has a robust 2D topological SVG map, declarative room generator (`ChaosGateService`), ATB combat loop, terminal parser, and BroadcastChannel/WebRTC transport. Adding a first-person lens, persistent overgrowth grafting, and passive proximity streetpass expands the depth without changing the underlying room and combat model.

## 3. Implementation Steps

- [x] **Step 1: Terminology & Domain Model Refactoring**: Update `domain.models.ts` with Overgrowth, Pruning, TravelerEcho, and Shards.
- [x] **Step 2: Tri-Chord Splicing & Overgrowth Generator**: Add `generateOvergrowthIncursion` to `ChaosGateService`.
- [x] **Step 3: Engine State & Movement Primitives**: Add `playerFacing`, rotation, `@prune` command, and shard tracking in `MudEngineService`.
- [x] **Step 4: Perspective First-Person Viewport Component**: Implement `FirstPersonStageComponent` with procedural SVG room styling, spatial doorways, interactive entity silhouettes, and action pills.
- [x] **Step 5: Google Cloud Function Broker**: Create `cloud-function/index.js`, `package.json`, and `deploy.sh`. Create standalone private repo at `cboler/linked-pocket-realms-broker`.
- [x] **Step 6: Thunderpass & Broker Transport Services**: Build `ThunderpassService` (privacy blinding, wake lock, BLE scan) and update `TransportService` with broker signaling.
- [x] **Step 7: UI Integration & Resonance Loom**: Update `app.ts`, `app.html`, `styles.scss` with 3-lens layout, Overgrowth meter, 2D directional arrow, and Resonance Loom interface.
- [x] **Step 8: Tests & Quality Gates**: Add unit tests in `app.spec.ts`, update E2E tests in `smoke.spec.ts`, verify with `npm test`, `npm run lint`, `npm run format:check`, and `npm run e2e`.
- [x] **Step 9: Archive Plan & Documentation**: Move plan to `completed/`, update `ARCHITECTURE.md`, `DECISIONS.md`, and `ROADMAP.md`.

## 4. Verification Plan & Results

- [x] Unit tests pass: `npm test` (19/19 passing)
- [x] Lint analysis passes: `npm run lint` (0 errors, 0 warnings)
- [x] Formatting passes: `npm run format:check` (All matched files use Prettier code style)
- [x] Playwright E2E smoke tests pass: `npm run e2e` (4/4 viewports passing in 13.0s)
- [x] Production build passes: `npm run build:pages` (Clean bundle generation, 404.html SPA fallback, ngsw.json configured)

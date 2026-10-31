# Execution Plan: Zero-Config Broker, Meaningful Tri-Chord Topologies & Organic Dungeon Growth

- **Date**: 2026-10-31
- **Status**: Completed
- **Owner**: Antigravity Assistant

## 1. Goal & Objectives

1. Eliminate manual URL entry for networking by introducing zero-config broker configuration (`runtime.config.ts`), auto-connecting on initialization, hardening the Cloud Function broker with preflight handling, ICE candidate array queuing, and payload caps, while providing seamless auto-stamping scripts.
2. Upgrade Tri-Chord procedural generation so each word meaningfully drives the dungeon experience:
   - Word 1 (Atmosphere) dictates environmental mutator tick effects and visual shader palettes.
   - Word 2 (Architecture/Theme) governs 4 distinct graph topologies (Grid-Loop, Deep Descent, Cluster-Spore, Symmetrical Wing).
   - Word 3 (Biome) populates distinct interactable props, enemy families, and boss archetypes.
3. Implement a compact, organic dungeon growth tree (`growthStage` 1..10, `vitalityXP`), allowing base dungeons to deterministically expand through player activities (combat, mechanism solving, pruning, peer collisions, passive cultivation) while keeping P2P/URL hash payloads under 1KB.
4. Add zero-server shareable URL cartridges (`?spore=...`) triggering overgrowth incursions, and introduce Seam Synthesis between native and overgrowth rooms.
5. Decompose `app.ts` / `app.html` by extracting the Resonance Loom / Multiplayer modal and the 2D Node Map Graph into clean standalone child components under `src/app/hud/`.

## 2. Context & Background

- The current implementation requires users to enter a Broker URL or defaults to empty. Same-device tabs communicate via `BroadcastChannel`, but remote P2P WebRTC requires broker connectivity.
- Baseline dungeons generate 8 rooms with basic topologies. Procedural generation should offer distinct architectural graph algorithms governed by the Tri-Chord.
- `app.html` is ~2,950 lines long. Component decomposition into dedicated HUD components (`node-map-graph.component` and `resonance-loom-dialog.component`) will reduce cognitive load and improve maintainability while adhering to Angular Signals and standalone components.

## 3. Proposed Changes

### Configuration & Broker

- `src/app/core/config/runtime.config.ts`: Export `RUNTIME_CONFIG` with `defaultBrokerUrl`, `autoConnectBroker: true`, `heartbeatIntervalMs: 15000`.
- `cloud-function/deploy.sh` and `cloud-function/deploy.ps1`: Pass `--min-instances=0 --max-instances=1`, fetch live function URI, and write it to `runtime.config.ts`.
- `cloud-function/index.js`: Return 204 on preflight OPTIONS, support ICE candidate queue array, cap sessions/spores to 500 with FIFO eviction, enforce 32KB payload limit.
- `transport.service.ts` & `thunderpass.service.ts`: Initialize with `RUNTIME_CONFIG.defaultBrokerUrl`. Replace manual broker URL input in main UI with one-tap status and `[⚡ Collide with Nearby Realm]` button; place manual override in collapsed Diagnostics accordion.

### Domain Models & Engine Growth

- `src/app/core/models/domain.models.ts`:
  - Add `growthStage` (1..10) and `vitalityXP` to `RealmData` / `RealmDelta`.
  - Define `RealmDnaPacket` (`{ triChord, growthStage, customRoomDeltas[], playerEcho }`) for compact <= 1KB transfers.
  - Add Seam Synthesis markers / triggers for border doorways connecting Native and Overgrowth rooms.
- `src/app/core/services/chaos-gate.service.ts`:
  - Implement 4 distinct graph topologies:
    1. Labyrinth / Clockwork (`Grid-Loop Topology`): Interconnected 2D grid loops with locked cross-corridors and shortcut levers.
    2. Catacombs / Sunken (`Deep Descent Topology`): Multi-stratum vertical layout with `Down`/`Up` stairwells.
    3. Mycelial / Fungal (`Cluster-Spore Topology`): Organic central hub with radiating 3-room spore pods and secret tunnels.
    4. Citadel / Sanctum (`Symmetrical Wing Topology`): Grand central nave with Left/Right trial wings and sealed Boss Sanctum.
  - Implement deterministic sprouting `growRealmToStage(baseAddress, growthStage, delta)` expanding rooms up to Stage 10 (~32 rooms).
  - Add `serializeRealmDna(delta, growthStage, echo)` and `deserializeRealmDna(sporeString)`.
- `src/app/core/services/mud-engine.service.ts`:
  - Award Vitality XP (+15 guardian, +10 puzzle/mechanism, +30 pruning, +40 realm collision, passive return tick).
  - Automatically evaluate stage leveling, sprout new wings, and announce in terminal & HUD.
  - Implement Seam Synthesis effect on boundary rooms.
  - Handle `?spore=` URL parameter on boot to trigger incursion.
- `src/app/viewport/first-person-stage.ts` & `.scss`:
  - Atmosphere palette shader mapping for all 8 AtmospherePrefix values.

### HUD Component Decomposition

- `src/app/hud/node-map-graph/node-map-graph.ts` (and template/styles):
  - Extract the SVG 2D topological node graph with click-to-move, unvisited node previews, fog-of-war, ghost dig nodes, visitor radar pips, and synthesis seams.
- `src/app/hud/resonance-loom-modal/resonance-loom-modal.ts` (and template/styles):
  - Extract the Resonance Loom modal with tabs (Weaver / Share URL, WebRTC Collider, Thunderpass Radar, Overgrowth), one-tap Collide button, and hidden Diagnostics accordion.

## 4. Implementation Steps

- [x] **Step 1: Zero-Config Cloud Broker & Hardening**:
  - Create `src/app/core/config/runtime.config.ts`.
  - Update `cloud-function/index.js`, `cloud-function/deploy.sh`, `cloud-function/deploy.ps1`.
  - Update `transport.service.ts` and `thunderpass.service.ts` to auto-connect to `RUNTIME_CONFIG.defaultBrokerUrl`.
- [x] **Step 2: Distinct 3-Word Topologies & Environmental Mutators**:
  - Update `chaos-gate.service.ts` with the 4 architectural layout algorithms and biome setpieces/interactables.
  - Enhance `first-person-stage` with atmosphere shader themes and mutator visual cues.
  - Add atmosphere tick effects to `mud-engine.service.ts` (Scorching, Frozen/Crystalline, Volt-Charged/Tempestuous, etc.).
- [x] **Step 3: Organic Dungeon Growth & Compact DNA Serialization**:
  - Update `domain.models.ts` with `growthStage`, `vitalityXP`, and `RealmDnaPacket`.
  - Implement `growRealmToStage` in `chaos-gate.service.ts`.
  - Award Vitality XP across game loops in `mud-engine.service.ts`, sprouting new wings on thresholds.
  - Implement compact DNA encoding/decoding (`serializeRealmDna` / `deserializeRealmDna`) <= 1KB.
- [x] **Step 4: Shareable URL Incursions & Seam Synthesis**:
  - Handle `?spore=` query parameter on initialization.
  - Implement synthesis seams between Native and Overgrowth rooms.
- [x] **Step 5: Component Decomposition Cleanup**:
  - Create `src/app/hud/node-map-graph/` and `src/app/hud/resonance-loom-modal/`.
  - Integrate into `app.ts` and `app.html`.
- [x] **Step 6: Verification & Quality Gates**:
  - Run `npm test`, `npm run lint`, `npm run format:check`, `npm run build`.
  - Verify all 33+ existing tests pass and add extensive new tests for topologies, growth, DNA encoding, and broker auto-connect.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (41/41 tests passing)
- [x] Static analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (clean)
- [x] Production build passes: `npm run build` (0 warnings, clean output)

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: Compact Realm DNA Packet assumes deterministic Mulberry32 seed reproducibility across clients. Custom dug rooms or manual overrides are sent in `customRoomDeltas[]` which must stay compact.
- **Rollback Strategy**: Git commits after each milestone allow clean reversion if any regressions arise.

# Execution Plan: Chamber History, Player Grimoires, Directional Spatial Audio & Synchronized Mechanisms

- **Date**: 2026-11-01
- **Status**: Completed
- **Owner**: Antigravity

## 1. Goal & Objectives

Extend the browser-native single-page MUD toward the master theorycrafting backlog:

1. **Context-Sensitive Chamber History & Fallen Explorer Memorials (Bloodstain Lore)**: Record fallen delvers when HP reaches 0; replicate tombstone markers across P2P mesh; weave memorial history into procedural room descriptions; support tribute offerings (`@tribute`) granting transient buffs.
2. **Player Grimoires & Sanctum Altars**: Enable authoring and discovering multi-page in-game lore books (`@book write`, `@book read`), rendering glowing altar lecterns in the 2.5D viewport and parchment reader modal.
3. **Directional Spatial Audio Panning**: Integrate native Web Audio `StereoPannerNode` into `SoundFxService` to pan footsteps, monster sounds, and phantom whispers based on doorway bearing relative to `playerFacing`.
4. **Synchronized Multi-Dungeon Mechanisms**: Twin resonance levers spawned in convergence chambers that require dual-player cooperation across the P2P mesh (or solo resonance shard harmonization) to unlock legendary vault rewards.

## 2. Context & Background

- The architecture is an Angular 22+ single-page PWA deployed on GitHub Pages with zero server-side dependencies.
- State is driven by Angular Signals (`signal`, `computed`).
- Zero third-party runtime dependencies allowed for game features.
- All views must pass strict mobile-first accessibility ($\ge 44\text{px}$ touch targets, no horizontal overflow) and quality gates (`npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run e2e`).

## 3. Implemented Changes

### Data Models (`src/app/core/models/domain.models.ts`)

- Added `TombstoneRecord` interface (`id`, `slainPlayerName`, `slainBy`, `epitaph`, `timestamp`, `tributeCount`).
- Added `GrimoireData` interface (`id`, `title`, `authorName`, `pages`, `createdAt`, `sealed`).
- Added `LinkedMechanismData` interface (`id`, `name`, `state`, `activatedByLocal`, `activatedByRemote`, `lastActivationTime`, `rewardClaimed`).
- Extended `RoomNode` and `RoomDeltaOverride` with `tombstones?: TombstoneRecord[]`, `grimoire?: GrimoireData`, `linkedMechanism?: LinkedMechanismData`.
- Extended `NetworkPacket` payload types for `TOMBSTONE_COMMITTED`, `GRIMOIRE_SHARED`, and `MECHANISM_PULLED`.
- Updated `ThunderpassSporePayload` with `tombstones?` and `grimoire?`.

### Sound FX Service (`src/app/core/services/sound-fx.service.ts`)

- Implemented `calculateBearingPan(targetDir?: Direction, playerFacing?: Direction): number` (-0.85 to +0.85 stereo pan) using trigonometric bearing delta.
- Routed audio voices through a `StereoPannerNode` connected to master gain.
- Added spatial audio support for footsteps, phantom whispers, combat strikes, and mechanism activation.
- Added `playTombstoneTribute()`, `playGrimoireTurn()`, and `playMechanismClank()`.
- Added `TRIBUTE`, `MECHANISM`, and `TOME` haptic patterns.

### Mud Engine Service (`src/app/core/services/mud-engine.service.ts`)

- In player defeat: records `TombstoneRecord` in the current room; broadcasts via mesh; logs commemorative epitaph.
- In `tributeFallenExplorer()`: offers 1 Resonance Shard to gain transient blessing (+15% Ward).
- Implemented `@book write` and `@book read` commands, plus `activeGrimoire` and `activeGrimoirePage` signals for the reader modal.
- In mutual convergence room grafting: spawns a `LinkedMechanismData` in hybrid chambers.
- Implemented `@lever pull` / `pullLinkedMechanism()`: handles dual-activation and solo shard harmonization (`@lever harmonize`).
- Dynamically weaves tombstone memorials, grimoire presence, and mechanism status into procedural chamber prose.
- Seeded primordial sanctum baselines: starter tombstone in `room-1`, ancient codex in `room-3`, and chrono-resonance lever in `room-5`.

### First-Person Viewport & HUD Stage (`src/app/viewport/first-person-stage.*`, `src/app/app.*`)

- In `first-person-stage.html`:
  - Rendered interactive 2.5D glowing lectern/tome on altar when `currentRoom().grimoire` is present (`data-testid="fp-grimoire-lectern"`).
  - Rendered interactive 2.5D weathered tombstone glyph when `currentRoom().tombstones?.length` (`data-testid="fp-tombstone-glyph"`).
  - Rendered interactive 2.5D twin lever mechanism when `currentRoom().linkedMechanism` is present (`data-testid="fp-linked-mechanism"`).
- In `app.html` & `styles.scss`:
  - Added interactive narrative prose chips and entity cards for memorials, tomes, and mechanisms.
  - Added Grimoire Reader Modal (`data-testid="grimoire-reader-modal"`) with page flip controls (`[◀ Prev]`, `Page X of Y`, `[Next ▶]`, `[Close]`).

## 4. Verification & Quality Gates

- **Unit tests**: 83/83 unit tests passing across all suites (`npm test`).
- **Static analysis**: Zero ESLint errors or warnings (`npm run lint`).
- **Formatting**: 100% Prettier compliant (`npm run format:check`).
- **Production build**: Clean build with bundles within budgets (`npm run build`).
- **Playwright E2E**: Multi-viewport smoke tests passing across mobile portrait, mobile landscape, tablet, and desktop (`npm run e2e`).

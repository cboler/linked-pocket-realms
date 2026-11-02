# Execution Plan: Modern MUD Theorycrafting UI/UX Polish Pass & Asynchronous Dungeon Splicing

- **Date**: 2026-11-01
- **Status**: Completed
- **Owner**: Antigravity Assistant

## 1. Goal & Objectives

1. Conduct a comprehensive UI/UX polish pass inspired by decades of internet MUD theorycrafting (interactive hypertext nouns, sensory atmosphere, seamless hybrid controls, and living asynchronous multiplayer).
2. Deepen the core design premise: when players visit a dungeon or pass by someone with the game open (via WebRTC, BroadcastChannel, or Thunderpass geohash proximity), the two dungeons automatically exchange information and generate new hybrid incursion rooms based on a combination of their features.
3. Add a zero-dependency synthesized Web Audio soundscape (`SoundFxService`) providing tactile footstep clicks, combat hits, harvest chimes, and an ethereal convergence chord on realm collisions, complete with a persistent HUD mute toggle.
4. Enhance the room stage with interactive narrative entity chips (monsters, loot, mechanisms, chalk inscriptions) directly beneath the room prose, eliminating friction between reading and taking action.
5. Implement Traveler's Inscriptions (chalk notes left on room floors by visiting players), rendered in both the 2.5D first-person viewport and narrative cards.
6. Wire power-user keyboard shortcuts (`1-4` for skill casting, `Space` for auto-combat / attack, `Tab` for target cycling, `I` for equipment, `N` for network gate) with visual hotkey badges.
7. Enumerate uncompleted features and future areas for improvement across the entire MUD theorycrafting backlog.

## 2. Context & Background

- **Linked Pocket Realms** combines an Etrian Odyssey-style 1st-person perspective dungeon crawler with an SVG topological node map and a classic text MUD engine.
- Internet MUD theorycrafting over 30+ years has continually circled several "Holy Grail" design challenges:
  - **The Wall of Text vs. Tactile Interaction**: Players skim narrative walls; modern theorycrafting calls for interactive hypertext where every noun in the room is directly actionable.
  - **Living Asynchronous Worlds**: Dungeons that cross-pollinate when players pass each other in the physical world (StreetPass) or visit each other's browser tabs (WebRTC/BroadcastChannel).
  - **Sensory Presence without Asset Bloat**: Procedural audio synthesis via the Web Audio API enables retro auditory feedback without downloading hundreds of megabytes of audio assets.
  - **Ephemeral Communication**: Leaving chalk notes, gravestones, and phantom echoes in foreign dungeons.

## 3. Proposed Changes

### Core Services

- `src/app/core/services/sound-fx.service.ts`:
  - New service creating synthesized audio cues via browser `AudioContext` (footstep, attack hit, skill cast, convergence chime, shard harvest, campfire rest).
  - Manages `isMuted` signal persisted in `localStorage`.
- `src/app/core/services/mud-engine.service.ts`:
  - Enhance `onNetworkPacket` for `GATE_BEACON` to automatically trigger reciprocal feature exchange and incursion room generation when crossing paths with a new peer.
  - Add `activeConvergenceBanner` signal: displays an encounter toast when realms collide or splice.
  - Add `leaveChalkInscription(note: string)` and store `inscriptions: ChalkInscription[]` on `RoomNode` and `RealmDelta`.
  - Wire `SoundFxService` into room transitions, combat hits, skill casts, and realm convergence events.

### Domain Models

- `src/app/core/models/domain.models.ts`:
  - Define `ChalkInscription` (`{ id, authorName, authorTriChord, text, timestampIso, glyph }`).
  - Add `inscriptions?: ChalkInscription[]` to `RoomNode` and `RoomOverrideDelta`.
  - Add `ConvergenceEncounterBanner` interface (`{ peerName, peerTriChord, localTheme, remoteTheme, roomsGraftedCount, timestampMs }`).

### Viewport & HUD Templates

- `src/app/app.html` & `app.scss`:
  - Add Convergence Encounter Toast/Banner at the top of the HUD with `[Delve Spliced Wing]` and `[Dismiss]` actions.
  - Add Audio Mute/Unmute toggle button in the header toolbar.
  - Add interactive narrative entity chips in the room stage narrative card (monsters, items, mechanisms, chalk notes, exits).
  - Add `[✏️ Inscribe Note]` modal/prompt on room stage.
  - Add hotkey badges (`[1]`, `[2]`, `[3]`, `[4]`, `[Space]`) on the skill bar and action buttons.
- `src/app/app.ts`:
  - Hook up keyboard event listeners for `1-4`, `Space`, `Tab`, `I`, `N`.
- `src/app/viewport/first-person-stage.html` & `.ts` & `.scss`:
  - Render glowing chalk inscription glyphs on chamber floors when present.
  - Add visual incursion particle drift / chromatic aura in Overgrowth and Seam rooms.

## 4. Implementation Steps

- [x] **Step 1: Domain Models & SoundFx Service**:
  - Add `ChalkInscription` and `ConvergenceEncounterBanner` to `domain.models.ts`.
  - Implement `SoundFxService` with Web Audio synthesized cues and mute toggling.
- [x] **Step 2: Engine Splicing & Inscription Logic**:
  - Update `mud-engine.service.ts` to trigger mutual splicing on peer discovery, populate `activeConvergenceBanner`, and handle chalk inscriptions.
  - Integrate `SoundFxService` calls across engine actions.
- [x] **Step 3: Interactive Narrative Chips & Hotkeys in UI**:
  - Update `app.html` with Convergence Banner, audio toggle, interactive entity chips, and chalk note popover.
  - Update `app.ts` with global keyboard hotkeys (`1-4`, `Space`, `Tab`, `I`, `N`).
  - Style new elements in `styles.scss` following mobile-first design tokens.
- [x] **Step 4: 1st-Person Stage Visuals & Chalk Rendering**:
  - Update `first-person-stage.html` to render chalk inscriptions and enhanced incursion particle effects.
- [x] **Step 5: Testing & Quality Gates**:
  - Add unit tests for `SoundFxService`, mutual peer splicing, and chalk inscriptions in `app.spec.ts`.
  - Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`.
- [x] **Step 6: Comprehensive Backlog Enumeration**:
  - Update `ROADMAP.md` and archive completed execution plan.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (72/72 tests passing)
- [x] Lint analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (clean)
- [x] Production build succeeds: `npm run build` (0 warnings, 168 kB transfer budget)
- [x] Real browser verification of audio toggle, convergence banner, and interactive narrative chips.

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: AudioContext requires a user gesture (click/keypress) before playing sound due to modern browser autoplay policies. Handled gracefully by deferring AudioContext initialization until the first interaction.
- **Rollback Strategy**: Clean Git working state allows immediate revert via `git checkout` if any regressions arise.

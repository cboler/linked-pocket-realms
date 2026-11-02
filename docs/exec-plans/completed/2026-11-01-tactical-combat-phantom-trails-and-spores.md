# Execution Plan: Tactical Combat Anatomy, Environmental Reactions, Phantom Trails & Spore QR

- **Date**: 2026-11-01
- **Status**: Completed
- **Owner**: Antigravity Assistant

## 1. Goal & Objectives

Implement the next milestone of the Internet MUD Theorycrafting backlog and the core premise of Linked Pocket Realms:

1. **Targetable Monster Anatomy**: Give Guardians, Elites, and Bosses breakable sub-components (`[⚡ Core Reactor]`, `[🗡️ Talon]`, `[🛡️ Chitin Carapace]`) that can be targeted in combat. Breaking an anatomical part deals critical damage, inflicts permanent status debuffs on the monster, emits unique audio/haptic feedback, and drops bonus Vitality shards.
2. **Environmental Spell Reactions (Elemental Alchemy)**: Tie player active skills into the room's atmospheric element and theme (e.g. Fire in Blighted/Fungal rooms triggers _Spore Conflagration_; Frost in Crystalline/Sunken rooms triggers _Cryo-Fracture_; Void in Silent/Ossuary rooms triggers _Entropy Collapse_), awarding bonus damage, status procs, and rich combat log prose.
3. **Phantom Traveler Breadcrumb Trails**: Record peer movement breadcrumbs across the P2P mesh and render translucent ethereal phantom wanderer silhouettes in the 2.5D viewport (`first-person-stage.html`) whenever a player walks into a room recently traversed by a peer.
4. **Zero-Dependency SVG Spore QR Code Generator & Portal**: Add a pure-TypeScript SVG QR Code generator in the Chaos Gate drawer, letting players instantly display or scan/paste spore codes to graft and exchange realm DNA with adjacent travelers without requiring central matchmaking servers.
5. **Mobile Device Haptics (`navigator.vibrate`)**: Provide subtle, tactile haptic pulses on touch devices for kinetic strikes, sub-part severances, and realm collisions.

## 2. Context & Background

- The starter is an Angular 22+ PWA with standalone components and Signals state management, running zero-server-dependency client-side code on GitHub Pages.
- Previous polish added procedural Web Audio, mutual realm collision splicing, floor inscriptions, and narrative prose chips.
- This phase elevates tactical depth (boss sub-targeting + elemental room combos) and living presence (phantom silhouettes + instant visual spore QR transfer).

## 3. Proposed Changes

- `src/app/core/models/domain.models.ts`:
  - Added `MonsterBodyPart` interface (`id`, `name`, `hp`, `maxHp`, `isSevered`, `debuffAppliedOnBreak`, `partEffectDescription`).
  - Added `targetableParts?: MonsterBodyPart[]` to `MonsterEntity`.
  - Added `PhantomBreadcrumb` interface (`peerId`, `playerName`, `archetype`, `roomId`, `roomTitle`, `timestampMs`, `heraldGreeting`).
  - Updated `NetworkPacket` and `ThunderpassSporePayload` to carry breadcrumbs.
- `src/app/core/services/sound-fx.service.ts`:
  - Added `playAnatomicalSeverance()`, `playResonanceReaction()`, `playPhantomWhisper()`.
  - Added `triggerHaptic(pattern)` with browser safe checks (`navigator.vibrate`).
- `src/app/core/services/mud-engine.service.ts`:
  - Generated targetable parts for Boss, Elite, and higher-tier monsters.
  - Implemented sub-target selection signal (`selectedTargetPart = signal<MonsterBodyPart | null>(null)`).
  - Enhanced `attackMonster()` and `castSkill()` to direct damage to selected body parts, trigger severances, and execute environmental spell reactions.
  - Tracked `phantomBreadcrumbs` ring buffer and compute `activeRoomPhantom` signal when entering rooms.
- `src/app/core/utils/qr-code.util.ts`:
  - Lightweight, zero-dependency pure-TypeScript module that generates an SVG path and viewBox matrix for a URL/string.
- `src/app/viewport/first-person-stage.html` & `first-person-stage.ts`:
  - Rendered targetable body parts in the mob target dock.
  - Rendered the phantom traveler silhouette in the 2.5D perspective chamber SVG when `activeRoomPhantom` is present.
- `src/app/app.html` & `src/app/app.ts`:
  - Displayed targetable parts chips in the HUD combat card.
  - Added Spore QR Beacon panel in the Chaos Gate drawer with SVG QR display, Copy URL, and Import Spore Seed actions.
  - Added Phantom Echo narrative badge in room prose.
- `src/styles.scss`:
  - Styled anatomy target pills, phantom silhouette animations, and spore QR card.

## 4. Implementation Steps

- [x] **Step 1: Domain Models & SoundFx Haptics**: Added `MonsterBodyPart`, `PhantomBreadcrumb`, new audio synthesis methods, and `triggerHaptic`.
- [x] **Step 2: Environmental Spell Reactions & Anatomy Logic in MudEngineService**: Wired targetable sub-parts generation, damage calculations, severance debuffs, and room atmosphere elemental reactions.
- [x] **Step 3: Lightweight SVG QR Code Generator**: Implemented `src/app/core/utils/qr-code.util.ts` for standalone P2P spore link sharing.
- [x] **Step 4: Viewport & HUD Integration**: Added sub-part target buttons in `first-person-stage` and `app.html`, phantom SVG silhouette in perspective chamber, and QR code beacon modal in Gate Drawer.
- [x] **Step 5: Testing & Quality Gates**: Added unit tests for anatomy severance, environmental reactions, and phantom trails; ran `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (79/79 passing across 4 test suites)
- [x] Lint analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (All matched files use Prettier code style)
- [x] Production build succeeds: `npm run build` (Transfer budget 173.96 kB)
- [x] Multi-viewport visual verification of target anatomy, phantom silhouettes, and QR code rendering.

## 6. Risks, Ceilings & Rollback

- **Ceiling**: QR generation uses a robust low-density matrix encoder suitable for spore URLs (seed + era + theme + player name); extremely massive custom cartridges fallback to raw code text copy/paste.
- **Rollback**: All state remains localized within Signals; revert commits if any regression occurs.

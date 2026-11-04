# Architectural Decisions

This document records the architectural decision records (ADRs) for this project.

Each record outlines the context, rationale, consequences, and trade-offs of significant architectural decisions made in the codebase. ADR-001 to ADR-005 come from the Angular PWA Starter this project was derived from; ADR-006 onward are Linked Pocket Realms decisions. Append new decisions to this log.

---

## Decision Index

- [ADR-001: Angular Standalone Components and Signals Architecture](#adr-001-angular-standalone-components-and-signals-architecture)
- [ADR-002: GitHub Pages Static Hosting with Dynamic Base Href and 404 Fallback](#adr-002-github-pages-static-hosting-with-dynamic-base-href-and-404-fallback)
- [ADR-003: Vitest for Unit Testing and Playwright for Multi-Viewport E2E Testing](#adr-003-vitest-for-unit-testing-and-playwright-for-multi-viewport-e2e-testing)
- [ADR-004: Vanilla SCSS Design Tokens over External CSS Frameworks](#adr-004-vanilla-scss-design-tokens-over-external-css-frameworks)
- [ADR-005: Built-in Angular Service Worker for Offline PWA Support](#adr-005-built-in-angular-service-worker-for-offline-pwa-support)
- [ADR-006: 1st-Person Perspective Viewport, Overgrowth Grafting, gcloud WebRTC Broker, and Privacy-Preserving Thunderpass](#adr-006-1st-person-perspective-viewport-overgrowth-grafting-gcloud-webrtc-broker-and-privacy-preserving-thunderpass)
- [ADR-007: Etrian Odyssey-Style Vector SVG Enemy Representations with Dynamic Adjective Mutators](#adr-007-etrian-odyssey-style-vector-svg-enemy-representations-with-dynamic-adjective-mutators)
- [ADR-008: Modern MUD UI/UX Polish — Interactive Narrative Hypertext, Synthesized Web Audio, Mutual Peer Splicing, and Traveler Inscriptions](#adr-008-modern-mud-uiux-polish--interactive-narrative-hypertext-synthesized-web-audio-mutual-peer-splicing-and-traveler-inscriptions)
- [ADR-009: Targetable Monster Anatomy, Environmental Spell Reactions, Phantom Trails & Zero-Dependency SVG QR Codes](#adr-009-targetable-monster-anatomy-environmental-spell-reactions-phantom-trails--zero-dependency-svg-qr-codes)
- [ADR-010: Directional Spatial Audio Panning, Bloodstain Lore Memorials, Delver Grimoires & Synchronized Conjunction Mechanisms](#adr-010-directional-spatial-audio-panning-bloodstain-lore-memorials-delver-grimoires--synchronized-conjunction-mechanisms)
- [ADR-011: Shadow Bazaar Dungeon Economy, Item Provenance Chains, and Multi-Peer WebRTC DataChannel Mesh](#adr-011-shadow-bazaar-dungeon-economy-item-provenance-chains-and-multi-peer-webrtc-datachannel-mesh)
- [ADR-012: Astral Echo Companion Bot Toggle Setting and Universal Mesh Labeling](#adr-012-astral-echo-companion-bot-toggle-setting-and-universal-mesh-labeling)
- [ADR-013: Per-Player Realm Progress and Home-Safe Realm Saves](#adr-013-per-player-realm-progress-and-home-safe-realm-saves)
- [ADR-014: Host-Authority Star Mesh, Frugal Broker Use, and No TURN (Yet)](#adr-014-host-authority-star-mesh-frugal-broker-use-and-no-turn-yet)
- [ADR-015: Astral Echo Pawn Companion, Room Respawns, Class-Sealed Chests, and Campfire Revival](#adr-015-astral-echo-pawn-companion-room-respawns-class-sealed-chests-and-campfire-revival)

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

## ADR-008: Modern MUD UI/UX Polish — Interactive Narrative Hypertext, Synthesized Web Audio, Mutual Peer Splicing, and Traveler Inscriptions

### Status

Accepted

### Context

Decades of MUD theorycrafting on Usenet, MudDev, and Reddit have identified persistent design barriers in traditional text-based games:

1. **Wall-of-Text Fatigue**: Dense narrative text requires cognitive parsing before players can decide on actions, creating friction between reading and doing.
2. **Sensory Disconnection**: Pure silent interfaces lack tactile feedback for footsteps, combat hits, or mystical occurrences.
3. **Passive Multiplayer**: In traditional MUDs, players must be online simultaneously in the same room. Asynchronous presence (leaving chalk marks, gravestones, and automatic dungeon cross-pollination on physical passes) bridges solo and multiplayer play.

### Decision

1. **Interactive Narrative Hypertext Chips**:
   - Integrated dynamic affordance chips directly inside the persistent room narrative card. Any monster, ground loot item, mechanism, or traveler inscription mentioned in the prose is presented as an actionable chip (`[⚔️ Mob]`, `[❖ Item]`, `[✍ Note]`, `[♨ Campfire]`, `[⚙ Mechanism]`).
2. **Synthesized Web Audio Soundscape (`SoundFxService`)**:
   - Implemented zero-dependency procedural audio synthesis using the standard browser `AudioContext`.
   - Generates tactile wooden/stone footsteps, ethereal harmonic convergence chimes (C5-E5-G5-C6), crisp combat strike impacts, magical skill energy whooshes, ascending shard harvest arpeggios, and warm campfire restoration chords.
   - Includes a persistent mute toggle in the top tactical header (`localStorage` backed).
3. **Bidirectional Mutual Splicing & Convergence Banner**:
   - Enhanced `MudEngineService` to automatically trigger reciprocal feature exchange when encountering live peer beacons (`GATE_BEACON`, WebRTC, or Thunderpass spores).
   - Dungeons deterministically graft hybrid incursion rooms combining both players' Tri-Chord features and display an accessible `ConvergenceEncounterBanner` with a direct `[🧭 Delve Spliced Wing]` shortcut.
4. **Traveler's Inscriptions (Floor Graffiti)**:
   - Added `@inscribe <note>` command and `[✍ Inscribe Note]` UI prompt, allowing adventurers to leave persistent chalk messages on chamber flagstones.
   - Inscriptions replicate over P2P mesh and render as glowing SVG floor runes in the 1st-person viewport.
5. **Power-User Keyboard Hotkeys**:
   - Added hotkeys `1-4` for active skill slots, `Space` for basic attack / auto-combat, `Tab` for monster target cycling, `I`/`P` for equipment paperdoll, `N` for network gate, and `M` for observatory map, complete with visual hotkey hints in the UI.

### Consequences

- **Positive**: Blends the tactical clarity of modern dungeon crawlers with the prose richness of classic MUDs; provides rich tactile feedback with zero audio asset footprint (0 KB downloads); realizes the vision of living pocket dungeons that organically cross-pollinate when players cross paths.
- **Trade-offs**: Autoplay policies require user interaction before the AudioContext resumes; handled smoothly by lazy initialization on first user gesture.

---

## ADR-009: Targetable Monster Anatomy, Environmental Spell Reactions, Phantom Trails & Zero-Dependency SVG QR Codes

### Status

Accepted

### Context

To deliver on decades of internet MUD theorycrafting and our core premise (living player dungeons that cross-pollinate when players visit or cross paths), combat needed greater tactical depth than simple monolithic HP depletion, and multiplayer presence needed to be tangible asynchronously without heavy backend servers. Furthermore, mobile and convention interactions needed instant camera-scannable spore link generation without bringing in bloated third-party QR libraries.

### Decision

1. **Targetable Monster Anatomy**: Added breakable sub-components (`MonsterBodyPart`: `id`, `name`, `hp`, `maxHp`, `isSevered`, `debuffAppliedOnBreak`, `partEffectDescription`) to Bosses, Elites, and high-tier mobs. Players can target sub-parts; breaking a part permanently applies severe debuffs (-35% Atk, -50% Mitigation, Stun/Silence), plays visceral audio snaps/crunches, triggers haptic severance vibrations, and awards +15 Resonance Shards.
2. **Environmental Elemental Alchemy**: Integrated skill elements with chamber atmospheric traits. Fire in Fungal/Blighted rooms triggers _Spore Conflagration_ (+35% AoE + Burn); Frost in Crystalline/Sunken triggers _Cryo-Fracture_ (+30% + Chill); Lightning in Clockwork/Tempestuous triggers _Overload Induction_; Void in Silent/Ossuary triggers _Entropy Collapse_ (HP Syphon); Bio in Labyrinthine triggers _Symbiotic Bloom_ (Stamina Surge).
3. **Phantom Wanderer Ghost Trails**: Traversal breadcrumbs are recorded into a 50-item ring buffer and exchanged across P2P beacons. Entering a chamber recently traversed by a peer displays an animated, translucent SVG wanderer silhouette in the 2.5D viewport with subtle audio whisper and narrative lore.
4. **Zero-Dependency Pure-TypeScript SVG QR Code Generator**: Implemented QR Code Model 2 with GF(256) Reed-Solomon error correction in `qr-code.util.ts`, generating instant crisp SVG QR codes and `#spore=...` URLs right in the Chaos Gate drawer.
5. **Mobile Haptics**: Integrated standard `navigator.vibrate` for kinetic strikes, sub-part severances, footsteps, and realm convergences.

### Consequences

- **Positive**: Elevated tactical combat and narrative variety; made offline/asynchronous player presence visceral in the 2.5D viewport; enabled instant zero-server camera sharing with 0 KB npm package additions.
- **Trade-offs**: QR code generator focuses on standard byte-mode encoding suitable for compact spore payloads; complex custom cartridges still use base64 text export.

---

## ADR-010: Directional Spatial Audio Panning, Bloodstain Lore Memorials, Delver Grimoires & Synchronized Conjunction Mechanisms

### Status

Accepted

### Context

To further realize the multi-decade MUD theorycrafting backlog and deep sensory/asynchronous immersion without adding any external server infrastructure or binary asset bloat:

1. **Sensory Immersion**: Traditional MUDs were text-only; adding synthesized sound was step one, but players still couldn't tell which direction phantom footsteps, whispers, or mechanical thuds were coming from in 2.5D space.
2. **Environmental Chamber Lore & Bloodstains**: When explorers fall in classic MUDs or Souls-like games, their deaths become part of the world's tapestry. We needed permanent, replicated fallen explorer memorials with commemorative epitaphs and tribute blessings.
3. **Player-Authored Lore**: Sanctums and deep chambers needed written history authored by delvers and architects (multi-page tomes and grimoires) that can be read on altars or in dedicated parchment modals.
4. **Synchronized Multi-Dungeon Mechanisms**: Conjunction and expedition chambers needed cooperative physical puzzles that can be solved across the P2P mesh or via solo resonance shard harmonization.

### Decision

1. **Directional Spatial Audio Panning**:
   - Integrated native Web Audio `StereoPannerNode` with a sinusoidal bearing formula (`calculateBearingPan(targetDir, playerFacing)`).
   - Generates realistic left/right stereo pans (-0.85 to +0.85) for footsteps through doorways, phantom whispers, combat strikes, and mechanism activations based on the player's 2.5D facing angle.
2. **Bloodstain Lore Memorials**:
   - Implemented `TombstoneRecord` committed to the chamber upon player defeat (recording slayer, timestamp, epitaph, and tribute count).
   - Replicated over P2P mesh (`TOMBSTONE_COMMITTED`) and Thunderpass spores.
   - Weaves tombstone lore into room narrative and renders interactive weathered stone markers in the 2.5D viewport.
   - Added `@tribute` command and UI chips allowing delvers to spend 1 Resonance Shard to honor the fallen, granting a +15% Ward blessing.
3. **Delver Grimoires & Altar Lecterns**:
   - Implemented `GrimoireData` to store multi-page tomes authored via `@book write <title> | <p1> | <p2>` and shared via `GRIMOIRE_SHARED`.
   - Renders 2.5D glowing lectern/tome pedestals in chambers hosting a grimoire and an interactive parchment reader modal with page-turning audio and haptics.
4. **Synchronized Conjunction Mechanisms**:
   - Added `LinkedMechanismData` representing twin chrono-resonance levers spawned in spliced chambers.
   - Requires cooperative activation by both dungeon architects via `@lever pull` / `MECHANISM_PULLED` mesh packets or solo harmonization using 10 Resonance Shards (`@lever harmonize`), unlocking a guaranteed Legendary Relic (`[Resonance Conduit Matrix]`) and +50 Shards.

### Consequences

- **Positive**: Rich directional soundscape using standard browser APIs with 0 KB assets; deep emergent lore and asynchronous player interaction; cooperative tactile mechanics that bridge isolated single-player dungeons into a shared multiverse.
- **Trade-offs**: `StereoPannerNode` is standard in modern desktop and mobile browsers, with fallback to centered mono output in legacy audio contexts.

---

## ADR-011: Shadow Bazaar Dungeon Economy, Item Provenance Chains, and Multi-Peer WebRTC DataChannel Mesh

### Status

Accepted

### Context

Traditional MUDs and MMOs rely on centralized servers and global auction houses to power player trade and co-op exploration. In Linked Pocket Realms, the core lore is that each player carries their own pocket dungeon, affecting and trading with other realms passively (via StreetPass/Thunderpass) or actively when multiple players connect to explore a dungeon together.

To fulfill this vision without introducing central servers or external databases, we needed:

1. **Decentralized Chamber Economy**: Player-owned merchant stalls / dead-drops in individual dungeon rooms where architects can sell surplus relics to visiting players, collecting proceeds in a persistent Sanctum Vault.
2. **Item Provenance Tracking**: Tangible item lore recording who forged the item, what realm it spliced through, and who purchased or plundered it.
3. **Multi-Peer P2P2P WebRTC Mesh**: Upgrading the 1-to-1 WebRTC transport into an arbitrary multi-client DataChannel mesh (`p2p2p2p ad nauseum`), allowing multiple adventurers to co-inhabit a host's dungeon.
4. **Visual Co-Delver Presence**: Rendering live adventurers in the 2.5D viewport with archetype silhouettes, health bars, and popping speech bubbles for room chat (`@say` / `@party`).

### Decision

1. **Shadow Bazaar & Sanctum Vault Economy**:
   - Modeled `BazaarListing` on chambers (`RoomNode.bazaar`), enabling `@bazaar sell <item> <price>`, `@bazaar buy <item>`, and `@bazaar` inspection.
   - Modeled `CharacterState.sanctumVaultShards` persisted in IndexedDB via `StorageService`. When a visitor buys an item, a `BAZAAR_PURCHASED` packet credits the seller's vault.
   - Added `@vault` and `@vault claim` / `@bazaar claim` with real-time UI pill indicator in the HUD header.
   - Stamped `ProvenanceRecord[]` on `EquipmentItem`, tracking the genesis forge, inter-realm splicing, and delver barter trades.
2. **Multi-Peer WebRTC Transport Mesh**:
   - Upgraded `TransportService` with `peerMesh = new Map<string, PeerChannelSession>()` to manage arbitrary concurrent `RTCDataChannel` connections simultaneously.
   - Broadcasts packets (`GATE_BEACON`, `BAZAAR_LISTED`, `BAZAAR_PURCHASED`, `PEER_CHAT`, combat events) across `BroadcastChannel` and all open mesh DataChannels.
3. **Live Co-Adventurer Presence & Speech Bubbles**:
   - Computed `peersInCurrentRoom` filtering active visitors in the same chamber.
   - Rendered interactive 2.5D SVG adventurer figures with archetype class silhouettes, level badges, dynamic health bars, and animated pop-in speech bubbles for `@say` / `@party` room chat.
   - Rendered 2.5D SVG Shadow Bazaar stall in chambers with goods for sale, complete with one-tap inspection and purchasing cards.

### Consequences

- **Positive**: 100% serverless peer-to-peer economy and party exploration; rich visual feedback for co-delvers in the 2.5D perspective viewport; immutable historical item provenance creates personal value for traded equipment.
- **Trade-offs**: WebRTC mesh scale is bounded by client bandwidth and NAT traversal topology (ideal for 2-8 co-delvers per realm, which matches party dungeon crawling).

---

## ADR-012: Astral Echo Companion Bot Toggle Setting and Universal Mesh Labeling

### Status

Accepted

### Context

Previously, `MudEngineService` unconditionally injected a simulated peer `Kite_Zero` (`peer-astral-echo`) into `transport.discoveredPeers` upon engine startup so solo players would have an immediate neighboring Chaos Gate to explore. While this served initial prototyping, it created confusion by showing `Adventurers: 2` and `P2P Gate (1)` for solo players. Furthermore, future plans call for autonomous companion bots capable of managing chambers while AFK or simulating elapsed time.

### Decision

1. **Default-Off Solo Mesh Authenticity**:
   - Seeded Astral Echoes are no longer injected unconditionally at startup.
   - A solo player starts with `Adventurers: 1` and `P2P Gate (0)`, reflecting genuine connected peers only.
2. **User-Controllable Companion Setting & Persistence**:
   - Introduced `astralEchoBotEnabled` reactive signal and persisted preference (`localStorage: linked_pocket_realms_astral_echo_bot`).
   - Accessible via the **🤖 Astral Echo Companion (Autonomous Bot)** card in the P2P Gate modal (`🌐 Realm Mesh Collider` tab) and via terminal commands (`bot on`, `bot off`, `@bot`, `echo on`, `echo off`).
3. **Universal Labeling**:
   - Any Astral Echo peer is explicitly tagged with `[Astral Echo]` or `[Echo]` across all UI surfaces:
     - Header adventurer counter: `👥 Adventurers: 2 (1 Echo)`
     - Roster ticker command (`who`): `Kite_Zero (Lv.4 Chronomancer) [Astral Echo] [Peer]`
     - P2P Gate anchor portals: `🤖 Astral Echo` pill badge
     - Anchor room stage portals: `🌀 Chaos Gate: Δ: Silent Fungal Observatory (Kite_Zero [Astral Echo])`
     - 1st-person viewport & room cards: `[Astral Echo]` entity badge
     - Minimap cartography node tooltips: `[Echo]` visitor label

### Consequences

- **Positive**: Eliminates ghost peer confusion while providing a clear toggleable companion bot for testing, portal traversal, and future autonomous AFK zone management routines.
- **Trade-offs**: Solo players exploring P2P portals without another human delver must toggle on their Astral Echo bot (or use the Wayfinder Rift Loom) to explore remote realms.

---

## ADR-013: Per-Player Realm Progress and Home-Safe Realm Saves

### Status

Accepted

### Context

Rooms are regenerated from the dungeon's seed on every load and every time the realm grows a stage. Nothing recorded which monsters the player had defeated or which items they had picked up, so:

- After a page reload, defeated monsters were back at full health and attacking.
- Picked-up loot reappeared on the floor while also staying in the inventory, so items could be duplicated (by reloading, or mid-session whenever the realm grew a stage).
- Visiting another player's realm saved that realm into the `active_home_realm_delta` slot, and "return home" rebuilt the home realm from a blank delta, losing its growth stage, custom rooms, and grafts.

### Decision

1. **`RealmProgress`, separate from `RealmDelta`**: a per-address record of defeated monster keys and collected item keys (`roomId/entityId`), stored at `realm_progress:<address>`. It is never sent to peers: a visitor who clears your rooms should not clear them for you, and peers should not receive your loot history.
2. **Reapply after every regeneration**: the engine marks recorded monsters as `hp: 0` and removes recorded items whenever rooms are rebuilt (load, gate dial, growth). Loading merges with anything recorded while the load was in flight.
3. **Expedition rifts are not recorded**: they are temporary and reuse fixed room ids.
4. **Home-safe saves**: every realm delta save goes through `persistRealmDelta()`. It always writes `realm_delta:<address>`, but writes the home slot only when the player is not visiting. Dialing the home address reuses the saved home delta instead of a blank one.
5. **Reload narration**: log lines written for the placeholder sanctum before the save loads are dropped, and the saved room is described instead.

### Consequences

- **Positive**: Fights and loot survive reloads; the duplication path is closed; visiting other realms is safe for the home save.
- **Trade-offs**: Cleared rooms stay cleared. There is no respawn rule yet, so a fully cleared realm only gains new monsters from growth (new rooms). A boss drop that is left on the floor is lost on reload, because the drop is created at kill time rather than generated from the seed. Both are noted in `docs/ROADMAP.md`.

---

## ADR-014: Host-Authority Star Mesh, Frugal Broker Use, and No TURN (Yet)

### Status

Accepted

### Context

Direct play did not work: connection codes were made before ICE gathering, so they carried no network addresses; a host could hold only one link (`createWebRtcOffer()` closed the others); every player fought a private copy of each monster; visiting used a placeholder realm instead of the host's; and every open tab called the broker every 4 seconds (most of the 2M/month free tier for one tab left open for a month). The owner wants a working mesh, the realm owner as the authority, and broker use that never approaches the free-tier limit. Failing on mobile data is acceptable if the UI says so.

### Decision

1. **Star topology per realm.** Visitors link to the realm owner (host); the host relays public packets between its visitors. No visitor-to-visitor links.
2. **Host authority.** The host decides monster HP, kills (with shared credit), and loot (first request wins). Visitors apply hits optimistically but never kill locally; loot only enters a visitor's inventory on the host's approval. Damage is clamped and rate-limited on the host. The host only hosts its home realm; leaving home tells visitors, who continue in an offline copy.
3. **Persistence stays per player (ADR-013).** Visitor kills change the host's live state, not the host's saved `RealmProgress`.
4. **Visitor-initiated, non-trickle handshake.** Join code (offer) from the visitor, reply code (answer) from the host, each made after ICE gathering completes. Works the same by copy-paste or through the broker mailbox, and supports many visitors per host.
5. **Resilient links.** 5 s pings, 20 s timeout, 30 s connect timeout, automatic rejoin for lobby links, inbound validation and rate limits, sender-must-match-link, and 30 s presence expiry.
6. **Frugal broker.** Hosting is opt-in and pauses when away from home, hidden, or idle 15 min; 20 s heartbeat that also returns join requests (updated broker); lobby fetched only while on screen; no startup call; per-browser daily cap (1,500) shared with Thunderpass; server daily ceiling (55,000) with `503` + `Retry-After`. Broker changes are backward compatible, so the client works with the currently deployed broker (at 2 calls per heartbeat).
7. **No TURN for now.** STUN only, with a plain-language note in the network tab and in connection-failure messages.

### Consequences

- **Positive**: Real multi-visitor play with one source of truth per realm; no loot duplication between visitors; small, predictable broker cost; codes work without the broker at all.
- **Trade-offs**: Host bandwidth and CPU grow with visitors (capped at 8). If the host's tab sleeps, visitors lose authority and fall back to an offline copy. Lobby joins can take up to ~20 s (one host heartbeat). Symmetric-NAT networks cannot connect until a TURN relay exists. The server ceiling is per instance and resets on cold start, so client-side discipline is the main guarantee. Statuses and severed anatomy parts are still simulated per player; only HP, kills, and loot are authoritative.
- **TURN, if added later**: prefer a managed relay with a free allowance and short-lived credentials minted by the existing broker, used only as an ICE fallback; avoid self-hosting coturn on the free e2-micro, whose 1 GB/month egress allowance is easy to exceed with relayed traffic.

---

## ADR-015: Astral Echo Pawn Companion, Room Respawns, Class-Sealed Chests, and Campfire Revival

### Status

Accepted (supersedes the fake neighbor beacon in ADR-012; amends ADR-013's "cleared rooms stay cleared")

### Context

The owner wanted the Astral Echo to become a pawn-like companion: it levels up, works when left unattended, can be talked to, and does jobs it knows or was taught (including farming the dungeon and handing over loot). Farming needs monsters to come back, but ADR-013 made cleared rooms permanent. The owner also asked for loot only some classes can reach (locked chests, lockpicking, lockpicks), and for fallen characters to be carried to a campfire and revived there, the same way for players and the Echo, with the fallen player asked before getting up.

### Decision

1. **Respawns.** `RealmProgress` records when each monster fell (`defeatedAt`). Regular monsters return after 60 minutes, bosses after 24 hours, checked every minute (never in the room you're standing in) and on load. Refilled monsters are restored from a pristine copy. Old saves migrate: kills without times start their cooldown at load. Floor items still never come back; new loot comes from seeded drops (25% item, 10% lockpick per regular kill).
2. **Sealed chests.** Generated per realm and room from the seed (treasure vaults always; other rooms 18%), so host and visitors agree. `LOCK` needs a Hexblade or Artificer plus a lockpick (`lockpickChance` from DEX, PER, and tier; a failure breaks the pick). `ARCANE` needs a Chronomancer (20 stamina). `HEAVY` needs a Vanguard (25 stamina). Opened chests are saved and never refill; their loot goes to the floor. In a hosted realm the host checks the visitor's class and opens it.
3. **The Echo lives in your home realm.** A pure, deterministic `stepEcho()` (in `astral-echo.ts`) runs live every 2 s and catches up after time away in 30 s steps, capped at 8 hours, with a report when more than 5 minutes passed. Its effects go through the engine's normal paths (kills recorded so rooms refill; broadcasts while hosting). Jobs: Follow, Scout, Farm (level 3+), and Routes taught with "Watch me". It is about 70% as strong as a player, retreats to rest when hurt, keeps lockpicks for chests its class can open, and hands over its satchel on request. It never uses the network. It's saved at `astral_echo_state`.
4. **Downed and carried.** A fallen Echo is down for 5 minutes, or revives at once if carried to a campfire. A fallen player: if their Echo is up, it carries them to the nearest campfire; if other players are in the realm, the player stays down where they fell (monsters ignore them) and anyone can carry them; otherwise they wake at the entrance as before. Arriving at a campfire with a carrier prompts the fallen player to get up there or go to the entrance. Carrying between players uses targeted `CARRY_START` / `CARRY_DROP` packets and presence beacons (`downed`, `carriedBy`); a downed player waits up to 3 minutes for help.

### Consequences

- **Positive**: Farming and the Echo give the dungeon a reason to revisit; class choice matters for loot; dying in company becomes a cooperative moment instead of a teleport.
- **Trade-offs**: Respawns mean cleared rooms refill for everyone. Catch-up is an approximation (coarse steps). Floor drops that aren't taken vanish on reload (they aren't part of the seed). A visitor's lockpick roll happens on the visitor's side (the host checks the class, not the roll). Balance values are first guesses kept as named constants (`ECHO_TUNING`, respawn and drop constants).

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

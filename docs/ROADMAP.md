# Project Roadmap

This document tracks **Linked Pocket Realms** milestones, its feature backlog, and technical debt. Part 1 records the Angular PWA Starter baseline the project was built on; Part 2 records how far the derivation from that starter has gone.

---

## Part 1: Starter Template Baseline

The foundational starter provides production-ready infrastructure out-of-the-box:

- [x] **Angular 22+ Standalone Baseline**: Modern Angular bootstrap, inject-based DI, and Signals reactivity.
- [x] **Service Worker & PWA Caching**: Pre-configured `@angular/service-worker` with `prefetch` and `lazy` asset groups.
- [x] **Automated GitHub Pages Deployment**: Fully automated GitHub Actions workflow with dynamic subpath `--base-href` resolution.
- [x] **SPA 404 Routing Fallback**: `scripts/prepare-pages.mjs` generating `404.html` from `index.html` to eliminate static host route refresh errors.
- [x] **Mobile-First Design System**: Vanilla SCSS design tokens, touch targets >= 44px, safe area insets, `:focus-visible` outlines, and zero horizontal scroll.
- [x] **Comprehensive Quality Gates**: Vitest unit testing, Playwright multi-viewport smoke tests, Angular ESLint, and Prettier formatting.
- [x] **Agent Documentation Suite**: `AGENTS.md`, `GEMINI.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and execution plan templates.

---

## Part 2: Derivation Checklist (Starter → Linked Pocket Realms)

Status of the starter's customization tasks for this project:

### 1. Rebrand Application Identity

- [x] Update `<title>`, `<meta name="description">`, and `<meta name="theme-color">` in `src/index.html`.
- [x] Root shell title: the brand heading lives in `src/app/app.html` (`#starter-title`, "Linked Pocket Realms").
- [x] Update `name`, `short_name`, and `description` in `public/manifest.webmanifest`.
- [ ] Rename the npm package (`package.json` still says `angular-pwa-starter`).

### 2. Replace Icons and Visual Assets

- [ ] Replace standard icons in `public/icons/` (72x72 through 512x512 PNGs, including maskable icon). Still the starter's icons.
- [ ] Replace browser favicon in `public/favicon.ico`. Still the starter's favicon.

### 3. Replace Placeholder Views

- [x] Replace `src/app/home/` with the game HUD (removed; the game is the root view).
- [x] `src/app/status/` diagnostic view removed (not retained).
- [x] Route definitions: `src/app/app.routes.ts` is intentionally empty (single view).

### 4. Implement Domain State & Persistence

- [x] Model domain types in `src/app/core/models/`.
- [x] Implement state services in `src/app/core/services/` using Angular Signals.
- [x] Add client-side persistence (IndexedDB via `StorageService`, plus a few `localStorage` preferences).

### 5. Configure Dynamic API Caching (If Applicable)

- [x] Not applicable: the only HTTP API is the optional broker, which must not be cached.

### 6. Expand Test Suites

- [x] Add unit tests for new services and components in `src/app/**/*.spec.ts`.
- [x] Update `e2e/smoke.spec.ts` with domain-specific smoke assertions and critical user journeys.

---

## Part 3: Project Roadmap

### Phase 1: MVP & Core MUD Engine (Completed)

- [x] **Milestone 1.1: Core Domain Entities & State**: 3-Word Tri-Chord addresses, Mulberry32 PRNG, ATB combat loop, and terminal parser.
- [x] **Milestone 1.2: Dual-Input Tactile HUD & Drawers**: SVG topological node cartography, equipment paperdoll, combat telemetry, and career chronicle.
- [x] **Milestone 1.3: User Flow Smoke Test**: Playwright multi-viewport smoke assertions across phone, tablet, and desktop.

### Phase 2: First-Person Lens, Overgrowth Splicing & Thunderpass (Completed)

- [x] **Milestone 2.1: Spliced Lore & Terminology**: Resonance Loom, Tri-Chord Lexicon, Overgrowth incursion rooms, and Pruning (`@prune`) for Resonance Shards.
- [x] **Milestone 2.2: First-Person Dungeon Viewport (`FirstPersonStageComponent`)**: 2.5D perspective room renderer, spatial doorways, unique Etrian Odyssey-style animated SVG enemy representations with adjective mutators, and directional movement (`playerFacing`).
- [x] **Milestone 2.3: Persistent Overgrowth Grafting & Pruning**: Deterministic incursion generation on collision, IndexedDB persistence across disconnects, and shard harvesting.
- [x] **Milestone 2.4: Serverless gcloud Broker & Thunderpass**: Gen 2 Cloud Function signaling broker, zero-knowledge geohash proximity relay, screen WakeLock, BLE scan, and Traveler's Echo encounters.

### Phase 3: Platform Capabilities, Sensory Immersion & Polish (Completed)

- [x] **Milestone 3.1: Native Web Platform APIs & Synthesized Soundscape**: Procedural zero-dependency Web Audio API (`SoundFxService`) for footsteps, ethereal dual-tone convergence chords, weapon hits, skill whooshes, shard harvests, and campfire restoration.
- [x] **Milestone 3.2: Keyboard Shortcuts & Power-User Controls**: Spatial movement (WASD / Arrows), skill queue hotkeys (`1`-`4`), auto-combat / strike toggle (`Space`), target cycling (`Tab`), equipment drawer (`I`/`P`), and network drawer (`N`).
- [x] **Milestone 3.3: Interactive Narrative Hypertext**: Inline entity chips beneath room prose allowing one-tap targeting, looting, mechanism pulling, and reading inscriptions without parsing walls of text.
- [x] **Milestone 3.4: Asynchronous Traveler Chalk Inscriptions**: Floor graffiti (`@inscribe <note>` and `[✍ Inscribe Note]`), SVG floor glyph rendering, and mesh replication.
- [x] **Milestone 3.5: Bidirectional Mutual Splicing & Convergence Banner**: Automatic exchange of Tri-Chords on live peer discovery (`GATE_BEACON`, WebRTC, Thunderpass) with direct `[🧭 Delve Spliced Wing]` action.
- [x] **Milestone 3.6: Targetable Monster Anatomy & Elemental Alchemy**: Breakable boss/elite anatomy parts with targeted severance debuffs and elemental chamber spell reactions (Burn, Cryo-Fracture, Overload, Entropy Syphon, Symbiotic Bloom).
- [x] **Milestone 3.7: Asynchronous Phantom Trails & Zero-Dependency SVG QR Codes**: Translucent phantom wanderer trails in 2.5D viewport and GF(256) pure TypeScript QR code generation for camera-scannable Thunderpass spores.
- [x] **Milestone 3.8: Directional Spatial Audio, Bloodstain Memorials, Grimoires & Synchronized Mechanisms**: Web Audio `StereoPannerNode` directional panning relative to player facing, fallen explorer tombstone lore (`@tribute`), multi-page player grimoires (`@book write`/`read`) with parchment modal, and twin resonance levers (`@lever pull`/`harmonize`).
- [x] **Milestone 3.9: Shadow Bazaar Economy, Item Provenance & Multi-Peer P2P2P Mesh**: Chamber merchant stalls, Sanctum Vault revenue collection, item forge/splice/barter provenance chains, multi-peer DataChannel transport, and 2.5D live co-delvers with health bars and popping speech bubbles.

### Phase 4: Production Hardening & Auditing (In Progress)

- [ ] **Milestone 4.1: Lighthouse PWA & A11y Audit**: Ensure 95+ scores on Performance, Accessibility, and Best Practices.
- [x] **Milestone 4.2: Bundle Budget Verification**: Verify production bundles stay within configured budgets in `angular.json` (< 170 KB transfer size).
- [ ] **Milestone 4.3: Real Device Verification**: Verify touch responsiveness and safe area insets on physical mobile devices.
- [x] **Milestone 4.4: Reload Persistence, Mobile Layout & Plain-Language Onboarding**: Defeated monsters and collected loot survive reloads and realm growth (ADR-013); visiting no longer overwrites the home realm; minimap moved out of the 3D view; enemies drawn at their real positions; phone portrait/landscape layouts and 44px touch targets; onboarding rewritten in plain language.
- [ ] **Milestone 4.5: Combat Difficulty Pass**: The first enemy dies to a single skill (89 damage vs 86 HP). Tune early fights so they teach the ATB gauge and elemental combos. (Deferred by the owner on 2026-11-03.)
- [x] **Milestone 4.7: Working Host-Authority Mesh** (ADR-014): multi-visitor star links over WebRTC with join/reply codes or the lobby; host decides HP, kills, and loot; heartbeats, timeouts, rejoin, validation; slim presence with ghost-trail breadcrumbs; frugal, capped broker use; plain Wi-Fi/mobile connectivity note. Verified by unit tests and a two-browser Playwright test over real WebRTC.
- [x] **Milestone 4.8: Deploy the Updated Broker** (deployed 2026-11-03, revision `pocket-realms-broker-00003`): deploy `linked-pocket-realms-broker` (mirrors `cloud-function/`) to get 1 call per host heartbeat instead of 2, targeted signal delivery, and the server daily ceiling. The client already works with the current broker.
- [x] **Milestone 4.9: Astral Echo Companion, Respawns, Sealed Chests, Campfire Revival** (ADR-015).
- [x] **Milestone 4.10: Echo Tactics, Knowledge, Escorts, Loans, Measured Balance** (ADR-016).
- [ ] **Milestone 4.6: Plain-Language Pass Beyond Onboarding**: Apply the onboarding wording approach to the HUD, drawers, and log (Incursions, Shards, Resonance Loom, Customs Gate, Tri-Chord).

---

## Part 4: Technical Debt & Maintenance Backlog

Use this section to track known simplifications, performance ceilings, or refactoring opportunities:

| Item ID | Description                                                      | Severity | Ceiling / Known Constraint                                                                                                                                                                                                                                                      | Target Phase |
| :------ | :--------------------------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------- |
| _TD-01_ | _In-memory guestbook scan_                                       | _Low_    | _Degrades above 500 entries; migrate to IndexedDB index cursor_                                                                                                                                                                                                                 | _Phase 4_    |
| _TD-02_ | _AudioContext Autoplay Suspension_                               | _Low_    | _Browser autoplay blocks audio until first user gesture; handled via resume_                                                                                                                                                                                                    | _Completed_  |
| _TD-03_ | _30-Room Dungeon Splicing Cap_                                   | _Medium_ | _Dungeons cap at 30 rooms to prevent memory bloat; requires pruning_                                                                                                                                                                                                            | _Completed_  |
| _TD-04_ | _Oversized engine, shell, and stylesheet_                        | _High_   | _`mud-engine.service.ts` ~5.5k lines, `app.html` ~3.4k, `styles.scss` ~4.3k. Split the engine into combat, rooms/movement, economy, and networking services with their own specs; move HUD sections into components_                                                            | _Phase 5_    |
| _TD-05_ | _Verified Drop signatures can be forged_                         | _High_   | _`verifyItemSignature()` accepts `ecdsa-sim-*` / `ecdsa-fallback-sig` and returns true without Web Crypto; any self-generated key passes. Reject simulated signatures from peers and only trust known keys. (Deferred by the owner on 2026-11-03.)_                             | _Phase 5_    |
| _TD-06_ | _Peer packets partly trusted_                                    | _Medium_ | _Packets are now validated, rate-limited, and sender-checked, trades must be targeted, and combat/loot are host-authoritative (ADR-014). Still trusted: bazaar purchases, inscriptions, grimoires, mechanism pulls, and a peer's self-reported level (used for the damage cap)_ | _Phase 5_    |
| _TD-07_ | _WebRTC host holds one link at a time_                           | _—_      | _Resolved by ADR-014 (star mesh, up to 8 visitors)_                                                                                                                                                                                                                             | _Completed_  |
| _TD-08_ | _Stale peers never expire_                                       | _—_      | _Resolved: 30 s presence expiry and link heartbeats_                                                                                                                                                                                                                            | _Completed_  |
| _TD-09_ | _Share links are not read on load_                               | _Medium_ | _QR/share URLs use `#spore=<address>`, but `hydrateFromStorage()` only reads `?spore=<dna>`; opening a shared link does nothing unless pasted into the Spore input_                                                                                                             | _Phase 5_    |
| _TD-10_ | _No respawn rule; boss drops left on the floor vanish on reload_ | _Low_    | _Respawns resolved (ADR-015: 60 min, bosses 24 h). Floor drops and boss drops still vanish on reload if not taken_                                                                                                                                                              | _Phase 5_    |
| _TD-11_ | _No TURN relay_                                                  | _Medium_ | _Symmetric-NAT networks (many mobile carriers) cannot connect; the UI says so. If added: managed TURN with short-lived credentials from the broker, as a fallback only (ADR-014)_                                                                                               | _Phase 5_    |
| _TD-12_ | _Only HP, kills, and loot are authoritative_                     | _Low_    | _Statuses, severed anatomy parts, and monster attacks are simulated per player during a visit_                                                                                                                                                                                  | _Phase 5_    |
| _TD-13_ | _Visitor lockpick rolls are client-side_                         | _Low_    | _In a hosted realm the host checks the visitor's class but trusts their lockpick roll (ADR-015)_                                                                                                                                                                                | _Phase 5_    |
| _TD-14_ | _Echo balance is untuned_                                        | _—_      | _Resolved: measured by `echo-balance.spec.ts` across eras and classes; hit-and-run exploit fixed (ADR-016). Retune against the harness_                                                                                                                                         | _Completed_  |

---

## Part 5: The Master MUD Theorycrafting Backlog & Uncompleted Features

Over decades of Usenet discussions, MudDev mailing lists, and roguelike/MUD theorycrafting communities, enthusiasts have envisioned the "Holy Grail MUD." Below is the prioritized master backlog for **Linked Pocket Realms**, classifying uncompleted features and future expansion vectors aligned with our core premise (user's personal browser dungeon, visited by peers, cross-pollinating and generating hybrid rooms upon crossing paths):

### 1. Asynchronous Living Pocket Dungeons & Crossing Paths (The StreetPass MUD)

- [x] **Phantom Traveler Pathing (Echo Ghost Trails)**:
  - Movement breadcrumbs (`id`, `peerId`, `playerName`, `roomId`, `timestampMs`) recorded across room traversal and gossiped over P2P mesh, rendering translucent animated SVG wanderer silhouettes in the 2.5D perspective viewport.
- [ ] **Environmental Cross-Pollination (Biotic Spores)**:
  - When two dungeons splice, allow foreign biome flora/fauna to slowly colonize neighboring native rooms over real-world hours (e.g. Fungal spores spreading bioluminescent mushrooms into Scorching Catacombs).
- [x] **Shared Dungeon Mechanisms & Co-op Levers**: (Twin resonance levers via `@lever pull` / `MECHANISM_PULLED`, Milestone 3.8.)
  - Two-player synchronized triggers: a heavy stone door in Host realm that requires a visitor in their own connected wing to stand on a pressure plate or flip a counterpart lever.
- [ ] **Customs Smuggling & Black Market Relics**:
  - Expand the Customs Gate ruleset: players with high PER or INT can attempt to "smuggle" slightly over-budget items past host inspection gates, risking curse or stat lockouts.
- [ ] **Wandering Dungeon Merchants**:
  - NPC merchants traveling along WebRTC / Thunderpass mesh conduits, carrying items traded or sold by distant players across the network.

- [x] **Astral Echo as a Pawn-Like Companion** (owner's direction, 2026-11-03; v1 built, ADR-015):
  - Grow the optional Astral Echo bot into an NPC companion in the spirit of a pawn: it levels up, performs behaviors when switched on and left unattended, and is interactable while on.
  - During interaction the player can ask it to do jobs it has learned or been taught (for example, farm your dungeon and hand you the loot).
  - Keep it opt-in and local-first (ADR-012). If it acts in a hosted realm, it should use the same host-authority actions as a visitor (ADR-014).
- [x] **Lend Your Echo to Other Players** (ADR-016: loans of 1/4/8 h with clamped returns, and escorting your visitors): send it into another player's realm (or lend it to your visitors) and have it come back with what it learned and found, like a hired pawn.
- [x] **More Taught Behaviors** (ADR-016: retreat threshold, avoid bosses, focus a monster type, and teaching you weaknesses): teach rules beyond routes (flee below X% HP, skip bosses, prefer a monster type), and let the Echo share what it knows about monsters with you.

### 2. Tactical Combat, Monster Ecology & Sensory Depth

- [x] **Procedural Monster Anatomy & Targetable Sub-Components**:
  - Guardians, Elites, and Bosses generate breakable anatomical sub-components (`[⚡ Core Reactor]`, `[🗡️ Talon]`, `[🛡️ Chitin Carapace]`). Striking sub-components applies focused damage, permanently severing limbs, applying severe monster debuffs (-35% Atk, -50% Mitigation, Stun/Silence), emitting visceral severance audio/haptics, and awarding +15 Resonance Shards.
- [x] **Spatial Audio Panning**: (Implemented with `StereoPannerNode`, Milestone 3.8.)
  - Enhance `SoundFxService` with Web Audio `PannerNode`: footsteps and monster breathing audibly pan left or right depending on the doorway direction relative to `playerFacing`.
- [x] **Environmental Spell Interactions (Elemental Alchemy)**:
  - Skills interact dynamically with room atmosphere elements: Fire in Fungal/Blighted rooms triggers _Spore Conflagration_ (+35% AoE + Burn); Frost in Crystalline/Sunken rooms triggers _Cryo-Fracture_ (+30% + Chill); Lightning in Clockwork/Tempestuous triggers _Overload Induction_; Void in Silent/Ossuary triggers _Entropy Collapse_ (HP Syphon); Bio in Labyrinthine triggers _Symbiotic Bloom_ (Stamina Surge).
- [x] **Tactile Haptic Feedback (Vibration API)**:
  - Zero-dependency `navigator.vibrate` integration on mobile devices for kinetic strikes (35ms), sub-part severances ([60, 40, 80]ms), elemental resonances ([40, 30, 40]ms), footsteps (15ms), and realm collisions.

### 3. Hypertext Rich Narrative & Procedural World-Building

- [ ] **Dynamic Grammar Engine & Linguistic Mutators**:
  - Expand room prose generation with context-sensitive adjectives reflecting active environmental history (e.g. rooms where 3+ visitors died gain descriptions like _"Scorched flagstones stained with the solemn echoes of fallen travelers"_).
- [ ] **Interactive Prop Inspection Minigames**:
  - Zero-syntax puzzle contraptions: rotating lock rings, rune alignment dials, and pressure sequences solvable directly from the room stage cards.
- [x] **Player-Authored Lore Books & Inscription Quills**: (Grimoires via `@book write` / `@book read`, Milestone 3.8.)
  - Allow Realm Architects to write multi-page lore grimoires (`@book write <title>`) placed on altar pedestals for visitors to read.

### 4. Zero-Friction Social & Network Commons

- [x] **Realm Cartridge QR Codes & Web Share Integration**:
  - Lightweight pure-TypeScript SVG QR Code generator (QR Model 2, GF(256) Reed-Solomon) in the Chaos Gate drawer, enabling camera scanning and URL spore links (`#spore=...`; note TD-09: links are not yet read on page load) with zero third-party dependencies.
- [ ] **Anonymous Geohash Territory Leaderboards**:
  - Aggregate coarse 600m geohash zones into local "Ley Line Nodes": players who walk through an area contribute to that zone's dominant Tri-Chord affinity.
- [ ] **Cooperative Boss Delves (Raid Convergence)**:
  - Multi-party boss encounters where 2-4 peers connected over WebRTC fight the same Titan simultaneously in shared real-time ATB turns.

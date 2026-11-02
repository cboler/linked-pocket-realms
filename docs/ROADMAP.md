# Project Roadmap

This document outlines the milestones for the **Angular PWA Starter** baseline and provides a structured roadmap template for downstream projects.

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

## Part 2: Downstream Derivation Onboarding Checklist

When creating a new project from this template, complete the following customization tasks:

### 1. Rebrand Application Identity

- [ ] Update `<title>`, `<meta name="description">`, and `<meta name="theme-color">` in `src/index.html`.
- [ ] Update `title` signal in `src/app/app.ts`.
- [ ] Update `name`, `short_name`, and `description` in `public/manifest.webmanifest`.

### 2. Replace Icons and Visual Assets

- [ ] Replace standard icons in `public/icons/` (72x72 through 512x512 PNGs, including maskable icon).
- [ ] Replace browser favicon in `public/favicon.ico`.

### 3. Replace Placeholder Views

- [ ] Replace `src/app/home/` with your application's domain UI and primary views.
- [ ] Retain or adapt `src/app/status/` as an internal diagnostic and environment verification screen.
- [ ] Update route definitions in `src/app/app.routes.ts`.

### 4. Implement Domain State & Persistence

- [ ] Model domain types in `src/app/core/models/`.
- [ ] Implement state services in `src/app/core/services/` using Angular Signals.
- [ ] Add client-side persistence (e.g. `localStorage`, `IndexedDB`, or native Web APIs) if the application operates offline.

### 5. Configure Dynamic API Caching (If Applicable)

- [ ] If your application consumes external HTTP APIs, configure `dataGroups` in `ngsw-config.json` choosing appropriate cache strategies (`freshness` or `performance`).

### 6. Expand Test Suites

- [ ] Add unit tests for new services and components in `src/app/**/*.spec.ts`.
- [ ] Update `e2e/smoke.spec.ts` with domain-specific smoke assertions and critical user journeys.

---

## Part 3: Downstream Project Roadmap Template

> **For Derivations**: Replace this section with your application's phased delivery milestones.

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

---

## Part 4: Technical Debt & Maintenance Backlog

Use this section to track known simplifications, performance ceilings, or refactoring opportunities:

| Item ID | Description                        | Severity | Ceiling / Known Constraint                                                   | Target Phase |
| :------ | :--------------------------------- | :------- | :--------------------------------------------------------------------------- | :----------- |
| _TD-01_ | _In-memory guestbook scan_         | _Low_    | _Degrades above 500 entries; migrate to IndexedDB index cursor_              | _Phase 4_    |
| _TD-02_ | _AudioContext Autoplay Suspension_ | _Low_    | _Browser autoplay blocks audio until first user gesture; handled via resume_ | _Completed_  |
| _TD-03_ | _30-Room Dungeon Splicing Cap_     | _Medium_ | _Dungeons cap at 30 rooms to prevent memory bloat; requires pruning_         | _Completed_  |

---

## Part 5: The Master MUD Theorycrafting Backlog & Uncompleted Features

Over decades of Usenet discussions, MudDev mailing lists, and roguelike/MUD theorycrafting communities, enthusiasts have envisioned the "Holy Grail MUD." Below is the prioritized master backlog for **Linked Pocket Realms**, classifying uncompleted features and future expansion vectors aligned with our core premise (user's personal browser dungeon, visited by peers, cross-pollinating and generating hybrid rooms upon crossing paths):

### 1. Asynchronous Living Pocket Dungeons & Crossing Paths (The StreetPass MUD)

- [x] **Phantom Traveler Pathing (Echo Ghost Trails)**:
  - Movement breadcrumbs (`id`, `peerId`, `playerName`, `roomId`, `timestampMs`) recorded across room traversal and gossiped over P2P mesh, rendering translucent animated SVG wanderer silhouettes in the 2.5D perspective viewport.
- [ ] **Environmental Cross-Pollination (Biotic Spores)**:
  - When two dungeons splice, allow foreign biome flora/fauna to slowly colonize neighboring native rooms over real-world hours (e.g. Fungal spores spreading bioluminescent mushrooms into Scorching Catacombs).
- [ ] **Shared Dungeon Mechanisms & Co-op Levers**:
  - Two-player synchronized triggers: a heavy stone door in Host realm that requires a visitor in their own connected wing to stand on a pressure plate or flip a counterpart lever.
- [ ] **Customs Smuggling & Black Market Relics**:
  - Expand the Customs Gate ruleset: players with high PER or INT can attempt to "smuggle" slightly over-budget items past host inspection gates, risking curse or stat lockouts.
- [ ] **Wandering Dungeon Merchants**:
  - NPC merchants traveling along WebRTC / Thunderpass mesh conduits, carrying items traded or sold by distant players across the network.

### 2. Tactical Combat, Monster Ecology & Sensory Depth

- [x] **Procedural Monster Anatomy & Targetable Sub-Components**:
  - Guardians, Elites, and Bosses generate breakable anatomical sub-components (`[⚡ Core Reactor]`, `[🗡️ Talon]`, `[🛡️ Chitin Carapace]`). Striking sub-components applies focused damage, permanently severing limbs, applying severe monster debuffs (-35% Atk, -50% Mitigation, Stun/Silence), emitting visceral severance audio/haptics, and awarding +15 Resonance Shards.
- [ ] **Spatial Audio Panning**:
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
- [ ] **Player-Authored Lore Books & Inscription Quills**:
  - Allow Realm Architects to write multi-page lore grimoires (`@book write <title>`) placed on altar pedestals for visitors to read.

### 4. Zero-Friction Social & Network Commons

- [x] **Realm Cartridge QR Codes & Web Share Integration**:
  - Lightweight pure-TypeScript SVG QR Code generator (QR Model 2, GF(256) Reed-Solomon) in the Chaos Gate drawer, enabling camera scanning and instant URL spore grafting (`#spore=...`) with zero third-party dependencies.
- [ ] **Anonymous Geohash Territory Leaderboards**:
  - Aggregate coarse 600m geohash zones into local "Ley Line Nodes": players who walk through an area contribute to that zone's dominant Tri-Chord affinity.
- [ ] **Cooperative Boss Delves (Raid Convergence)**:
  - Multi-party boss encounters where 2-4 peers connected over WebRTC fight the same Titan simultaneously in shared real-time ATB turns.

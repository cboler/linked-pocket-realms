# Execution Plan: Serverless P2P MUD PWA ("Linked Pocket Realms")

- **Date**: 2026-10-30
- **Status**: In Progress
- **Owner**: Antigravity Agent

## 1. Goal & Objectives

Build **Linked Pocket Realms**, a serverless Peer-to-Peer Multi-User Dungeon (MUD) Progressive Web Application inspired by `.hack`'s Chaos Gate system and classic MOO/MUD curation. Every browser instance generates, hosts, and curates its own Pocket Realm stored in `IndexedDB`, features a deterministic 100ms tick-based Active Time Battle (ATB) + Tactical Skill Queue combat engine with dual terminal/HUD input parity, role-based perspective switching (Explorer, Architect/Overseer, Spectator/Chronicle Replay), on-demand SVG/Canvas data/telemetry drawers, and serverless P2P networking (`BroadcastChannel` + `WebRTC` SDP handshakes) with Web Crypto ECDSA provenance and Customs Gate stat clamping.

## 2. Context & Background

Initialized from `cboler/angular-pwa-starter` into `cboler/linked-pocket-realms`. Preserves the Angular standalone components, Signals reactivity, `@angular/service-worker` offline caching, and GitHub Pages SPA fallback (`scripts/prepare-pages.mjs`).

## 3. Proposed Changes

- **Phase 1 — Boilerplate Purge & Core Schemas**:
  - Remove starter demo components (`src/app/home`, `src/app/status`).
  - Configure root layout as a clean, zero-scroll-bleed `100dvh` dark-mode tactical HUD.
  - Create `src/app/core/models/domain.models.ts` containing `ChaosGateAddress`, `LegendRegistry`, `CharacterState`, `PaperdollSlots`, `SkillSlot`, `RoomNode`, `RealmDelta`, `TelemetryLog`, `NetworkPacket`, `CommandIntent`, `RulesetManifest`, and `CombatState`.
- **Phase 2 — Deterministic Chaos Gate Generator & Local Engine**:
  - Implement `Mulberry32` PRNG and 3-Word Chaos Gate generator (`ChaosGateService`).
  - Implement `LegendRegistryService` with core shared legend and extensible custom legend entries.
  - Implement `StorageService` (`IndexedDB` persistence + JSON/base64 cartridge export/import + Web Crypto ECDSA keypair generation & signing/verification).
  - Implement `MudEngineService` (100ms ATB tick loop, auto-attack toggle, 4 active skill slots + 2 passives, elemental/status combos with atmosphere mutators, MOO `@dig`, `@describe`, `@craft`, `@trigger` commands, declarative `WHEN / IF / DO` triggers, dual-input `CommandIntent` dispatcher).
- **Phase 3 — Hybrid HUD, Paperdoll & Perspective Switcher**:
  - Build main tactical HUD (`100dvh` zero-scroll-bleed) with Role-Based Perspective Switcher (`Explorer`, `Architect`, `Spectator`).
  - Explorer View: Fog-of-War SVG cartography, Sensory Terminal with clickable inline entity badges, live ATB timeline bar, immediate vitals, Inspector Lens gated by `PER` & Bestiary knowledge.
  - Architect View: God's-Eye Topological Graph (SVG nodes, secret doors, lock-and-key, difficulty curves), Live Visitor Radar, Visual & Terminal Editor for rooms, `WHEN / IF / DO` triggers, spawns, and custom Legend glyphs.
  - Spectator / Chronicle Replay View: Scrub through recorded combat/delve logs left by visitors.
- **Phase 4 — Data Visualization & Telemetry Drawers**:
  - Slide-over drawers using custom SVG components:
    1. **Equipment Paperdoll & Character Sheet Drawer**: Interactive SVG/CSS Paperdoll (`Head`, `Chest`, `Legs`, `Main-Hand`, `Off-Hand`, `Relic 1`, `Relic 2`) with `Verified Drop` / `Architect Forged` provenance and Customs Gate clamp badges, Attribute Radar/Spider SVG chart, derived curves, and Filterable Inventory Grid with stat-comparison tooltips.
    2. **Combat Telemetry & Log Analytics Drawer**: Horizontal stacked bar charts & sparklines for DPS/Mitigation/Healing/Overkill per skill/element, plus RNG Roll Distribution Histogram and status uptime.
    3. **Realm Analytics & History Drawer**: Dungeon Heatmap modes (_Visitor Traffic_, _Room Lethality_, _Average Time Spent_, _Loot Extracted_) + Realm Guestbook & Gravestones.
    4. **Traveler's Chronicle Drawer**: Career timeline, wealth/XP progression line graphs, and searchable Bestiary/Item Compendium.
- **Phase 5 — P2P Transport, Portals & Customs Gate**:
  - Implement `TransportService` with RxJS streams:
    - Adapter 1 (`BroadcastChannel`): Automatic cross-tab Anchor Room linking, active Chaos Gate Portal spawning, cross-tab visiting, trading, and co-op ATB combat.
    - Adapter 2 (`WebRTC`): P2P room codes and copy-paste SDP handshakes for serverless play.
  - Implement Customs Gate ruleset enforcement & `SubtleCrypto` ECDSA signature verification and dynamic stat budget clamping on guest items.

## 4. Implementation Steps

- [ ] **Step 1: Phase 1 — Boilerplate Purge & Core Schemas**
- [ ] **Step 2: Phase 2 — Deterministic Chaos Gate Generator, Legend Registry, Storage & ATB Engine**
- [ ] **Step 3: Phase 3 — Hybrid HUD, Perspective Switcher & Interactive SVG Cartography/Editor**
- [ ] **Step 4: Phase 4 — On-Demand SVG Telemetry, Paperdoll & Chronicle Drawers**
- [ ] **Step 5: Phase 5 — Serverless P2P Transport (`BroadcastChannel` + `WebRTC`) & Customs Gate**
- [ ] **Step 6: Unit Tests, E2E Playwright Verification & Real Browser Inspection**

## 5. Verification Plan

- [ ] Unit tests pass: `npm test`
- [ ] Lint analysis passes: `npm run lint`
- [ ] Formatting passes: `npm run format:check`
- [ ] Production build passes: `npm run build:pages`
- [ ] Multi-viewport E2E smoke tests pass: `npm run e2e`
- [ ] Real browser verification across viewports

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: `IndexedDB` and `SubtleCrypto` in headless JSDOM unit tests may have partial implementations; services will include clean fallback to in-memory storage and deterministic signature fallback when `crypto.subtle` or `indexedDB` is unavailable in unit test environments.
- **Rollback Strategy**: Git branch / commit history allows clean rollback at each phase boundary.

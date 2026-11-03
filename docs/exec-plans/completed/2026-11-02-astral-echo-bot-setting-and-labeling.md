# Execution Plan: Astral Echo Companion Bot Toggle Setting & Universal Labeling

- **Date**: 2026-11-02
- **Status**: Completed
- **Owner**: Antigravity Agent

## 1. Goal & Objectives

Transition simulated "ghost" peers (Astral Echoes, e.g. `Kite_Zero` / `peer-astral-echo`) from unconditional startup injection into an explicit, user-controlled companion bot feature that is:

1. **Defaulted to "Off"**: A fresh game session defaults to solo authenticity (`Adventurers: 1`, `P2P Gate (0)`, and an unpopulated peer list until a real player joins or the companion is enabled).
2. **Universally Labelled**: Whenever an Astral Echo is active, it is clearly labelled with `[Astral Echo]` in the adventurer roster (`who`), P2P Gate portals list, stage entity cards, minimap tooltips, and 1st-person viewport nametags.
3. **User-Controllable Setting**: A persisted setting (`localStorage: linked_pocket_realms_astral_echo_bot`) accessible via the P2P Gate modal (`🌐 Realm Mesh Collider` tab) and via terminal commands (`bot on`, `bot off`, `@bot`, `echo on`, `echo off`).
4. **Extensible Architecture**: Lays clean architectural ground for future autonomous AFK zone management and simulated time progression.

## 2. Context & Background

Previously, `MudEngineService.constructor()` unconditionally injected a mock peer `Kite_Zero` (`peer-astral-echo`) into `transport.discoveredPeers` so solo players would have a discovered Chaos Gate portal to traverse in early prototypes. This created the appearance that there were "always 2 adventurers" even when playing alone.

## 3. Proposed Changes

- **`src/app/core/models/domain.models.ts`**:
  - Add `isAstralEcho?: boolean` to `NetworkPeerVisitor` and `NetworkPacket`.
- **`src/app/core/services/transport.service.ts`**:
  - Support `isAstralEcho` in `handleIncomingPacket` and `injectSimulatedPeerBeacon`.
  - Add `removeDiscoveredPeer(peerId: string): void` to safely evict inactive/toggled-off peers from `discoveredPeers`.
- **`src/app/core/services/mud-engine.service.ts`**:
  - Add `readonly astralEchoBotEnabled = signal<boolean>(false)`.
  - Hydrate setting from `localStorage` (`linked_pocket_realms_astral_echo_bot`). Default is `false`.
  - Remove unconditional injection of `Kite_Zero` at startup; only inject if `astralEchoBotEnabled()` is `true`.
  - Add `toggleAstralEchoBot(enable?: boolean): boolean` method with narrative and audio feedback.
  - Update `listAdventurersInRealm()` (`who` command) to label peers having `isAstralEcho` or ID `'peer-astral-echo'` as `[Astral Echo]`.
  - Support `bot [on|off]` and `echo [on|off]` commands in `parseAndDispatchTerminalInput()`.
- **`src/app/hud/resonance-loom-modal/resonance-loom-modal.html` & `.scss`**:
  - Add **🤖 Astral Echo Companion (Autonomous Bot)** settings card with toggle button in `🌐 Realm Mesh Collider` tab.
  - Label `[Astral Echo]` next to simulated portals in the local anchor portals list.
- **`src/app/app.html` & `src/app/viewport/first-person-stage.html`**:
  - Update stage entity cards, portal pills, and 1st-person viewport nametags to display the `[Astral Echo]` badge when an echo peer is present.
- **`src/app/hud/node-map-graph/node-map-graph.ts`**:
  - Append `[Echo]` to node visitor tooltips for astral echo peers.
- **`e2e/smoke.spec.ts` & `src/app/app.spec.ts`**:
  - Update E2E test to toggle on the Astral Echo companion before traversing its portal.
  - Update unit tests and add dedicated test coverage for the bot toggle, persistence, labeling, and default-off solo state.

## 4. Implementation Steps

- [x] **Step 1**: Update `domain.models.ts` and `transport.service.ts` with `isAstralEcho` and `removeDiscoveredPeer()`.
- [x] **Step 2**: Add `astralEchoBotEnabled` state, persistence, `toggleAstralEchoBot()`, and CLI commands to `mud-engine.service.ts`.
- [x] **Step 3**: Update `resonance-loom-modal.html` with settings toggle card and echo badge.
- [x] **Step 4**: Update `app.html`, `first-person-stage.html`, and `node-map-graph.ts` with universal `[Astral Echo]` labels.
- [x] **Step 5**: Update unit tests in `app.spec.ts` and add tests for default-off, toggle, and labeling.
- [x] **Step 6**: Update `e2e/smoke.spec.ts` to verify the toggle and traversal.
- [x] **Step 7**: Run full verification suite (`npm test`, `npm run lint`, `npm run format`, `npm run format:check`, `npm run e2e`) and browser check.
- [x] **Step 8**: Archive execution plan to `docs/exec-plans/completed/`.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (91/91 passing)
- [x] Lint analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (Prettier clean)
- [x] E2E smoke tests pass: `npm run e2e` (4/4 viewports pass)
- [x] Production build passes: `npm run build`
- [x] Verified solo launch shows `👥 Adventurers: 1` and `P2P Gate (0)`.
- [x] Verified enabling bot shows `👥 Adventurers: 2 (1 Echo)` and `P2P Gate (1)` with clear `[Astral Echo]` badges.
- [x] Verified persistence across localStorage.

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: The bot is currently a passive beacon / traversal anchor. Autonomous action loops (AFK area management, simulation of time passing) will build upon this toggle in future milestones.
- **Rollback Strategy**: Revert changes via Git if regressions are detected.


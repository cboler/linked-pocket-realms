# Execution Plan: Mobile-First UI & Ergonomics Redesign

- **Date**: 2026-10-30
- **Status**: Completed
- **Owner**: Antigravity Agent

## 1. Goal & Objectives

Redesign the **Linked Pocket Realms** user interface with a strict **Mobile-First** architecture and desktop browser progressive enhancement:

1. **Mobile-First CSS Architecture**: Invert stylesheet organization in `src/styles.scss` so base rules target narrow mobile viewports first, progressively enhancing for desktop browsers (`@media (min-width: 960px)`) and landscape mobile viewports.
2. **Touch Target & Thumb-Zone Ergonomics**:
   - Streamline the top tactical header on mobile to display identity, active Chaos Gate pill, segmented Role Switcher (`Explorer`, `Architect`, `Spectator`), and quick mobile layout mode controls (`Split`, `Stage`, `Map`).
   - Relocate the 6 On-Demand Telemetry & Character Drawer triggers into an ergonomic bottom thumb-bar on mobile viewports (`grid-area: dock`), docking seamlessly into the top header bar on desktop browsers (`@media (min-width: 960px)`).
   - Convert slide-over drawers and modals into mobile bottom sheets with drag-handle indicators and safe-area inset support (`env(safe-area-inset-*)`).
3. **Responsive Landscape & Split Deck Optimization**:
   - Use a side-by-side split layout on mobile landscape and desktop browsers so vertical space is never starved.
   - Make horizontal strips (Chaos Gate dialer, Map Legend, Compass, Skill Bar, Quick Command Chips) scroll smoothly along the X-axis on narrow viewports with zero page-level horizontal scroll overflow.

## 2. Context & Background

While the initial implementation of **Linked Pocket Realms** established the full serverless P2P MUD engine, 3-Word Chaos Gate generator, ATB combat loop, and SVG telemetry drawers, its layout relied on desktop-oriented flex wrapping in the top header that crowded narrow mobile viewports.

## 3. Proposed Changes

- **`src/app/app.ts`**:
  - Added `mobileLayoutMode = signal<'SPLIT' | 'STAGE' | 'MAP'>('SPLIT')` and `setMobileLayoutMode()` helper, automatically restoring `'SPLIT'` when switching roles from `'STAGE'` mode so perspective docks remain visible.
- **`src/app/app.html`**:
  - Structured the tactical shell with mobile-first semantics: compact `.header-top-row` with `.mobile-view-switcher` (`Split`, `Stage`, `Map`), segmented `.perspective-switcher`, thumb-zone `.drawer-toolbar` dock, and `.sheet-grab-handle` inside `.drawer-sheet`.
- **`src/styles.scss`**:
  - Rewrote base styles from the ground up for mobile viewports first, with CSS Grid area placement (`header` / `main` / `dock` / `footer` on mobile; `header dock` / `main main` / `footer footer` on desktop browser `>= 960px`), bottom-sheet drawers on mobile, and side-by-side split on desktop and landscape viewports.
- **`src/app/app.spec.ts` & `e2e/smoke.spec.ts`**:
  - Added unit and multi-viewport E2E assertions verifying mobile layout mode toggles, perspective switching, and zero horizontal overflow across viewports.

## 4. Implementation Steps

- [x] **Step 1: Author Execution Plan**: Document redesign scope and verification criteria.
- [x] **Step 2: Component State & Template Redesign (`src/app/app.ts`, `src/app/app.html`)**: Add mobile layout mode controls, ergonomic bottom navigation dock, and refined stage/map structure.
- [x] **Step 3: Mobile-First Stylesheet Rewrite (`src/styles.scss`)**: Implement mobile-first CSS tokens, touch targets, safe area insets, landscape grid adaptation, and bottom-sheet drawers.
- [x] **Step 4: Expand Unit & E2E Tests (`src/app/app.spec.ts`, `e2e/smoke.spec.ts`)**: Verify mobile layout switching, touch ergonomics, and cross-viewport rendering.
- [x] **Step 5: Quality Gates & Real Browser Verification**: Run `npm test`, `npm run lint`, `npm run format:check`, `npm run build:pages`, and `npm run e2e`.

## 5. Verification Plan

- [x] Unit tests pass: `npm test`
- [x] Lint analysis passes: `npm run lint`
- [x] Formatting passes: `npm run format:check`
- [x] Multi-viewport E2E smoke tests pass: `npm run e2e`
- [x] Real browser verification across mobile and desktop viewports

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: Both the SVG Cartography Map and Persistent Room Stage remain visible in default `SPLIT` mode to support simultaneous spatial and narrative awareness; mobile users can switch to `STAGE` or `MAP` focus with a single tap.
- **Rollback Strategy**: Revert changes to `src/app/app.html`, `src/app/app.ts`, and `src/styles.scss` via git if any viewport regression occurs.

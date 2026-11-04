# Execution Plan: Reload Persistence, Mobile Layout, Minimap Placement, Plain-Language Onboarding & Docs Refresh

- **Date**: 2026-11-03
- **Status**: Completed
- **Owner**: Claude Code (Opus 5.5)

## 1. Goal & Objectives

Fix the problems found in a play-through review of the live site:

1. Defeated monsters came back (and attacked) after a reload; the log described the wrong room.
2. The minimap overlay covered a large part of the first-person view, especially on phones.
3. The phone layout squeezed the 3D view to ~110px tall, cut off room text, scrolled the skill bar sideways, and most buttons were below the 44px touch-target rule. Phone landscape showed almost no 3D view.
4. Onboarding relied on invented terms (Chaos Gate, Class Core, Herald, Thunderpass, Customs Gate) with no stated goal.
5. Docs still described the Angular PWA Starter (missing `home/`/`status/` folders, unticked checklist).

## 2. Context & Background

- Rooms are regenerated from the seed on load and on every realm growth stage; only `RealmDelta`, character, and telemetry were saved.
- While tracing (1), two related save bugs surfaced: visiting a realm saved it into the home slot, and "return home" rebuilt the home realm from a blank delta (losing growth). Picked-up loot also reappeared, allowing duplication.
- While fixing (2), a rendering bug surfaced: the enemy sprite host used `display: contents`, which drops the SVG `transform`, so every enemy was drawn at x=0 (far left, stacked).

## 3. Proposed Changes

- `domain.models.ts`: new `RealmProgress` type.
- `storage.service.ts`: `saveRealmProgress` / `loadRealmProgress`; `saveRealmDelta(delta, asHomeRealm)`.
- `mud-engine.service.ts`: record defeats and pickups; reapply after every regeneration; `persistRealmDelta()` for home-safe saves; reuse the saved home delta when dialing home; re-describe the saved room after hydration.
- `realm-persistence.spec.ts`: reload, loot, narration, and visit/return tests (all four fail on the previous code).
- `app.html` / `styles.scss`: minimap moved into the info column; phone header folded to two rows; skill bar fits phones; landscape side-by-side layout; 44px floor for touch/narrow; `.hotkey-hint` hidden on touch.
- `first-person-stage.*`: compact nav bar on phones/landscape, 5:3 canvas on phones, hint dock hidden when idle on phones.
- `enemy-sprite.scss`: remove `display: contents` from the SVG host.
- Onboarding text rewritten; class blurbs; difficulty shown as a level; first log line simplified.
- Docs: `AGENTS.md`, `INSTRUCTIONS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (ADR-013), `docs/ROADMAP.md`.

## 4. Implementation Steps

- [x] **Step 1: Reload persistence** (ADR-013) with tests.
- [x] **Step 2: Minimap out of the 3D view** and enemy position fix.
- [x] **Step 3: Phone portrait, phone landscape, touch targets.**
- [x] **Step 4: Plain-language onboarding.**
- [x] **Step 5: Docs refresh**, preserving all ADRs, guardrails, and backlog direction.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (98/98). On Node 26 locally, four existing `localStorage` tests fail because Node's built-in `localStorage` shadows jsdom's; they pass with `NODE_OPTIONS=--no-experimental-webstorage` and on CI's Node 24.
- [x] Lint analysis passes: `npm run lint`
- [x] Formatting passes for all changed files: `npm run format:check` (one pre-existing uncommitted edit in `2026-11-02-clear-take-all-loot-ux.md` was left untouched)
- [x] Multi-viewport E2E smoke tests pass: `npm run e2e` (4/4)
- [x] Real browser verification: phone portrait (375x812: header 112px, 3D view 209px, 0 buttons under 44px, no horizontal scroll), phone landscape (812x375: view left, controls right), tablet portrait (768x1024), desktop. Reload after a kill shows the "Slain" marker and the correct room text.

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: No respawn rule, and unclaimed boss drops vanish on reload (TD-10). The 44px floor uses `!important` inside a touch/narrow media query on purpose. Desktop mouse layouts keep their denser controls.
- **Follow-ups logged in `docs/ROADMAP.md`**: TD-04 (split large files), TD-05 (forgeable Verified Drops, deferred), TD-06 (peer packet trust), TD-07 (WebRTC host keeps one link), TD-08 (stale peers), TD-09 (share links not read on load), Milestones 4.5 (combat difficulty, deferred) and 4.6 (plain language beyond onboarding).
- **Rollback Strategy**: Revert the commit. Saved `realm_progress:*` keys are ignored by older builds.

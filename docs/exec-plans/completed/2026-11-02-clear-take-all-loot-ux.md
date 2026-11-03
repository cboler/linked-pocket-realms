# Execution Plan: Clear "Take All" vs "Take Item" Loot Usability & Multi-Item Actions

- **Date**: 2026-11-02
- **Status**: Completed
- **Owner**: Antigravity Agent

## 1. Goal & Objectives

Address player confusion around collecting chamber loot by making item pickup actions explicit, intuitive, and transparent:

1. **Explicit "Take All" Action**: Add a dedicated `takeAllRoomItems()` engine method and UI controls (`📦 Take All (X)`) so players can intentionally sweep all chamber loot in one click or via terminal (`take all`, `loot all`).
2. **Clear Single-Item Action**: Distinguish taking a single item (`✋ Take Item` / `✋ Take This`) from sweeping the chamber, preventing ambiguity when chambers contain single vs. multiple drops.
3. **Transparent Narrative Feedback**: Report the exact count and names collected in the Event Ticker (e.g. `Collected [Item Name] into inventory (1 item).` vs `Collected all chamber loot (3 items: [A], [B], [C]) into inventory.`).
4. **Viewport & Stage Parity**: Ensure both the 2.5D First-Person Stage (floor chests & target actions) and the Tactical HUD (narrative chips & item cards) provide clear "Take All" and "Take Item" controls.

## 2. Context & Background

Previously, `takeRoomItem(itemId?: string)` only collected one item at a time. However, because most chambers (and boss encounters) generate exactly one loot drop, clicking `[✋ Take]` would cause all loot in the chamber to vanish simultaneously. This created usability confusion: players were unsure whether the button was a single-item pickup or a "Take All" mechanic. Furthermore, players explicitly enjoy the convenience of taking all loot in one go, but require clarity on what the action is doing.

## 3. Proposed Changes

- **`src/app/core/models/domain.models.ts`**:
  - Add `'TAKE_ALL_ITEMS'` to `CommandIntent['type']` and `TerminalFeedBadge['actionType']`.
- **`src/app/core/services/mud-engine.service.ts`**:
  - Implement `takeAllRoomItems(): void`:
    - Collects all items in `currentRoom().items` in a single batch.
    - Applies customs gate ruleset enforcement if visiting an external realm.
    - Updates room items, player inventory, and telemetry `lootExtractedCount`.
    - Emits clear narrative feed: `Collected all chamber loot (N items: [Item1], [Item2]) into inventory.`
    - Plays audio chime and saves state.
  - Update `takeRoomItem(itemId?: string)`:
    - When taking a single item, log remaining items on ground if any.
  - Update `dispatchCommandIntent`:
    - Handle `'TAKE_ALL_ITEMS'`.
  - Update `parseAndDispatchTerminalInput`:
    - Recognize `take all`, `loot all`, `get all`, `take *`, `loot *`.
    - If `take` is entered with no arguments in a multi-item room, invoke `takeAllRoomItems()`.
- **`src/app/app.ts` & `src/app/app.html`**:
  - Add `onStageTakeAllItems(): void` to `App`.
  - In `app.html`, when `engine.currentRoom().items.length > 1`:
    - Render a prominent `📦 Take All (${engine.currentRoom().items.length} Items)` header button above item cards.
    - Render a `📦 Take All (${engine.currentRoom().items.length})` narrative chip in the quick interaction row.
  - Refine item card buttons:
    - If 1 item: `✋ Take Item`
    - If > 1 item: `✋ Take This` (with tooltip explaining it only takes this item).
- **`src/app/viewport/first-person-stage.ts` & `first-person-stage.html`**:
  - Add `takeAllItems(): void`.
  - In `fp-item-actions` cluster:
    - When `currentRoom().items.length > 1`, display `📦 Take All (${currentRoom().items.length})` alongside `✋ Take This Item`.
    - When `currentRoom().items.length === 1`, display `✋ Take Item`.
- **`src/app/app.spec.ts` & `e2e/smoke.spec.ts`**:
  - Add unit tests verifying `takeAllRoomItems()`, single-item pickup with remaining count, and `take all` terminal command.
  - Verify multi-viewport E2E smoke tests.

## 4. Implementation Steps

- [x] **Step 1**: Add `'TAKE_ALL_ITEMS'` to `domain.models.ts` and implement `takeAllRoomItems()` in `mud-engine.service.ts`.
- [x] **Step 2**: Add terminal parsing for `take all` / `loot all` and update single-item feedback in `takeRoomItem()`.
- [x] **Step 3**: Update `app.ts` and `app.html` with explicit "Take All" button & chip when multiple items exist, and refined "Take Item" labels.
- [x] **Step 4**: Update `first-person-stage.ts` and `first-person-stage.html` with "Take All" option in viewport actions.
- [x] **Step 5**: Add comprehensive unit tests in `app.spec.ts`.
- [x] **Step 6**: Run quality gates (`npm test`, `npm run lint`, `npm run format:check`, `npm run e2e`, `npm run build`).
- [x] **Step 7**: Archive execution plan to `docs/exec-plans/completed/`.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (94/94 passing)
- [x] Lint analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (Prettier clean)
- [x] E2E smoke tests pass: `npm run e2e` (4/4 viewports pass)
- [x] Production build passes: `npm run build`
- [x] Single item chamber: UI displays `✋ Take Item`, narrative logs `Collected [Item Name] into inventory.`
- [x] Multi-item chamber: UI displays `📦 Take All (N)`, individual cards display `✋ Take This`, clicking Take All loots all items and logs names.
- [x] Terminal: `take all` loots all chamber items cleanly.

## 6. Risks, Ceilings & Rollback

- **Ceiling / Known Limitation**: Inventory capacity is currently unconstrained. Future weight/slot caps will build upon these single/batch collection methods.
- **Rollback Strategy**: Revert commits via Git if regressions are detected.

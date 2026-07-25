# Plan 040: Enforce imagery-only visibility during tree point selection

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If any STOP condition occurs, stop and report back instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat eef81c8..HEAD -- src/map/context/MapContext.tsx src/features/map/components/Map.tsx src/features/intake/components/TreeStoryFlowPanel.tsx src/map/context/MapContext.test.tsx src/features/intake/components/TreeStoryFlowPanel.test.tsx`
>
> If drift exists, compare the "Current state" excerpts below against live code and stop if the excerpts no longer match.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `eef81c8`, 2026-07-25

## Why this matters

Tree/story point selection currently leaves all map layers visible, which creates visual clutter and increases mis-click risk when selecting an existing tree or placing a new one.  
The requested behavior is to hide non-imagery layers during selection for both "Add Tree" and "Add Tree Story" flows, while ensuring imagery is always visible.  
This must preserve user intent when they manually toggle layers during selection mode and must remain stable through back/start-over/re-entry transitions.

## Current state

- `src/features/intake/components/TreeStoryFlowPanel.tsx` controls selection mode via step-based effects:
  - `TreeStoryFlowPanel.tsx:214-220`
    - `setTreeSelectionEnabled(step === "existing-tree-location");`
    - `setNewTreePlacementEnabled(step === "new-tree-location" || step === "new-tree-form");`
- `src/map/context/MapContext.tsx` has selection toggles but no layer-visibility mode API:
  - `MapContext.tsx:61-67` exposes setters for tree selection and new tree placement only.
  - `MapContext.tsx:287-304` dispatches those actions directly.
- `src/features/map/components/Map.tsx` uses selection toggles for click handlers only:
  - `Map.tsx:222-273` existing-tree click selection effect
  - `Map.tsx:275-314` new-tree placement click selection effect
  - No effect currently orchestrates layer visibility for point-selection mode.

### Conventions to match

- Runtime state is centralized in `MapContext` reducer/actions (`src/map/context/MapContext.tsx`).
- Map side effects and ArcGIS event wiring belong in `Map.tsx` and use `useEffect` with cleanup.
- Tests use Vitest + Testing Library:
  - `src/map/context/MapContext.test.tsx`
  - `src/features/intake/components/TreeStoryFlowPanel.test.tsx`

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test` | exit 0, all tests pass |

## Scope

**In scope (only files to modify):**
- `src/map/context/MapContext.tsx`
- `src/features/map/components/Map.tsx`
- `src/features/intake/components/TreeStoryFlowPanel.tsx`
- `src/map/context/MapContext.test.tsx`
- `src/features/intake/components/TreeStoryFlowPanel.test.tsx`

**Out of scope (do not modify):**
- Service modules (`src/features/intake/services/*`)
- Form components (`src/components/add-tree-form.tsx`, `src/components/add-story-form.tsx`)
- Router/layout/theme files
- Any mobile/native shell not represented in this repo

## Steps

### Step 1: Add an explicit point-selection visibility mode in map runtime state

1. In `src/map/context/MapContext.tsx`, add a dedicated runtime flag/API for "point-selection visibility mode active".
2. Keep this mode separate from `treeSelectionEnabled` and `newTreePlacementEnabled` so layer logic can be driven by one unified state.
3. Ensure reducer transitions are idempotent (setting true twice or false twice leaves stable state).

**Verify**: `pnpm test -- src/map/context/MapContext.test.tsx` → tests pass with new reducer/runtime assertions.

### Step 2: Implement imagery-only visibility orchestration in map runtime effects

1. In `src/features/map/components/Map.tsx`, add a new `useEffect` driven by `mapView` and the new visibility-mode flag.
2. On mode enter:
   - Identify currently active imagery/basemap layer(s).
   - Force active imagery/basemap visible.
   - If none are active, enable default basemap imagery fallback.
   - Set non-imagery operational layers to `visible = false`.
3. During mode:
   - Respect user layer toggles made in layer list UI.
4. On mode exit:
   - Preserve latest user-intended visibility state (do not force-restore a stale pre-entry snapshot).
5. Ensure all listeners/watchers are cleaned up on dependency change/unmount.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` → updated flow tests pass.

### Step 3: Wire flow steps to the unified visibility mode

1. In `src/features/intake/components/TreeStoryFlowPanel.tsx`, derive a single boolean for point-selection mode.
2. Enable mode for:
   - `existing-tree-location`
   - `new-tree-location`
3. Disable mode for:
   - `choose-path`
   - `new-tree-form`
   - `story-form`
   - `success`
   - `resetFlow` and back-navigation exits
4. Keep existing behavior for tree selection and new-tree placement toggles unchanged.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` → includes assertions for mode transitions and no regressions.

### Step 4: Add regression tests for visibility behavior

1. Extend `src/map/context/MapContext.test.tsx` to assert new mode state/action behavior.
2. Extend `src/features/intake/components/TreeStoryFlowPanel.test.tsx` to cover:
   - Existing-tree path enters/exits imagery-only mode.
   - New-tree path enters/exits imagery-only mode.
   - Start-over/back flows clear mode.
   - Re-entry stays stable (no duplicate side effects).
3. If current test harness cannot observe layer visibility directly, add narrow, test-only seams/mocks in-scope to validate mode-triggered calls without expanding scope.

**Verify**: `pnpm test` → all tests pass.

### Step 5: Run full verification gates

Run from repo root:
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`

**Verify**:
- All three commands exit 0.
- No files outside scope are changed (`git status --short`).

## Test plan

- **Reducer-level** (`MapContext.test.tsx`):
  - mode defaults to off
  - enable/disable transitions are idempotent
- **Flow-level** (`TreeStoryFlowPanel.test.tsx`):
  - existing-tree and new-tree paths both activate mode at selection steps
  - leaving selection steps deactivates mode
  - back/start-over/re-entry keep mode consistent
- **Manual QA (after automated checks)**:
  - Enter existing-tree selection: only imagery visible.
  - Enter new-tree selection: only imagery visible.
  - Toggle a layer during selection, then exit: latest user state remains.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] Both flows (`existing-tree-location`, `new-tree-location`) activate imagery-only visibility mode
- [ ] Imagery is forced visible during selection; default basemap imagery fallback is used when none active
- [ ] Exiting selection preserves latest in-mode user toggles
- [ ] No out-of-scope files changed

## STOP conditions

Stop and report if any of the following happens:

1. `Map.tsx` cannot reliably distinguish imagery/basemap from operational layers with available ArcGIS layer metadata.
2. Implementing preservation of in-mode user toggles requires changing files outside the in-scope list.
3. New mode wiring breaks existing tree selection/new-tree placement behavior and cannot be resolved in two attempts.
4. In-scope files have drifted enough that the current-state excerpts no longer match.

## Risks & gotchas

- ArcGIS map compositions vary; imagery detection must not depend on a single hard-coded layer ID.
- Layer-list interactions can race with effect-driven visibility writes.
- Re-entry/nested transitions can leak watchers unless cleanup is exact.

## Rollback plan

If regressions occur:
1. Remove only the new point-selection visibility mode wiring.
2. Keep existing tree selection and new-tree placement behavior intact.
3. Re-run `pnpm test` to confirm baseline intake flow still passes.

## Maintenance notes

- Future changes to map basemap switching should revisit imagery detection logic in this plan.
- Reviewers should pay special attention to effect dependencies/cleanup and to preserving user toggles on exit.
- If mobile-specific map code is added later, replicate this mode behavior there using the same state contract from `MapContext`.

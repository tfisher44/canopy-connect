# Plan 080: Fix MapPlaceholder ref-cleanup lint warning

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c451b46..HEAD -- src/features/map/components/Map.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `c451b46`, 2026-07-25

## Why this matters

The map component currently has a React Hooks lint warning about using `layerListElementRef.current` directly in cleanup. This pattern can remove listeners from a different element than the one originally subscribed, creating subtle event-leak bugs on remounts. Fixing this eliminates warning noise and hardens map lifecycle behavior.

## Current state

- `src/features/map/components/Map.tsx` — registers ArcGIS event listeners on mount.
- Lint warning points to cleanup usage of `layerListElementRef.current`.

Current excerpt:

- `src/features/map/components/Map.tsx:391-404`
  - listener is added via `layerListElementRef.current?.addEventListener(...)` and removed via `layerListElementRef.current?.removeEventListener(...)`.

Repo conventions:

- Lifecycle effects should store stable local references for setup/cleanup symmetry.
- Lint warnings are treated as actionable quality debt.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `pnpm install` | exit 0 |
| Lint | `pnpm lint` | warning removed for `Map.tsx` |
| Tests | `pnpm test -- src/features/map/components/Map.test.tsx` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope**:

- `src/features/map/components/Map.tsx`
- `src/features/map/components/Map.test.tsx` (only if needed for lifecycle coverage)

**Out of scope**:

- Map behavior redesign
- Intake flow logic

## Steps

### Step 1: Capture stable layer list element reference in effect

Inside the map wiring effect, assign `const layerListElement = layerListElementRef.current;` before registering handlers. Use `layerListElement` consistently for both add/remove listener calls.

**Verify**: `pnpm lint` → no warning for `Map.tsx:401`.

### Step 2: Validate map tests and type safety

Run targeted map tests and typecheck to ensure lifecycle logic still behaves as expected.

**Verify**:

- `pnpm test -- src/features/map/components/Map.test.tsx` passes.
- `pnpm typecheck` exits 0.

## Done criteria

- [ ] Lint warning about `layerListElementRef.current` cleanup is removed.
- [ ] Map component tests pass.
- [ ] Typecheck passes.
- [ ] No files outside scope changed.

## STOP conditions

- Drift check shows effect structure changed enough that line-based fix no longer applies.
- Fix requires touching unrelated runtime wiring files.

## Maintenance notes

- Keep add/remove listener target identity paired within the same lexical scope for all ArcGIS element refs.


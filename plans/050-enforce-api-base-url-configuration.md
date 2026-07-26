# Plan 050: Enforce explicit API base URL configuration for intake writes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c451b46..HEAD -- src/features/intake/services/treeService.ts src/features/intake/services/storyService.ts src/vite-env.d.ts .env.sample README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/020-add-record-flow-plan.md`
- **Category**: bug
- **Planned at**: commit `c451b46`, 2026-07-25

## Why this matters

The tree/story write services build endpoints from `VITE_CANOPY_API_BASE_URL`, but currently default to an empty string. That causes requests to silently fall back to `/api/trees` and `/api/stories` on the frontend origin, which breaks when API and UI are not co-hosted. The active feature now depends on these calls for the happy path, so setup ambiguity becomes a broken user flow. This plan makes configuration explicit and fail-fast, then documents how to run correctly.

## Current state

- `src/features/intake/services/treeService.ts` — tree create API call.
- `src/features/intake/services/storyService.ts` — story create API call.
- `src/vite-env.d.ts` — typed env declarations currently missing `VITE_CANOPY_API_BASE_URL`.
- `.env.sample` — only has `ARCGIS_API_KEY`.
- `README.md` — scripts/setup docs do not mention API base URL requirement.

Current excerpts:

- `src/features/intake/services/treeService.ts:22-29`
  - `getApiBaseUrl()` returns `""` when `VITE_CANOPY_API_BASE_URL` is unset.
- `src/features/intake/services/treeService.ts:41`
  - endpoint is built as ``${getApiBaseUrl()}/api/trees``.
- `src/features/intake/services/storyService.ts:22-29,32`
  - same pattern for `/api/stories`.
- `src/vite-env.d.ts:3-5`
  - only `ARCGIS_API_KEY` is declared.
- `.env.sample:1`
  - currently `ARCGIS_API_KEY=` only.

Repo conventions to follow:

- Service errors are explicit and surfaced (`throw new Error(...)`), not swallowed (`src/features/intake/services/storyService.ts:52-62`).
- Runtime contract checks use Zod where response shape matters (`src/features/intake/services/storyService.ts:17-20,58-67`).
- Tests use Vitest + Testing Library with user-observable assertions (`src/features/intake/components/TreeStoryFlowPanel.test.tsx`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 (warnings allowed only if pre-existing and unrelated) |
| Tests | `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` | all pass |

## Scope

**In scope**:

- `src/features/intake/services/treeService.ts`
- `src/features/intake/services/storyService.ts`
- `src/vite-env.d.ts`
- `.env.sample`
- `README.md`
- `src/features/intake/components/TreeStoryFlowPanel.test.tsx` (only if assertions need adjustment)

**Out of scope**:

- Any backend/API server implementation
- ArcGIS map rendering/runtime logic (`src/features/map/**`)
- Unrelated style-guidelines feature code

## Git workflow

- Branch: `advisor/050-enforce-api-base-url`
- Commit style: Conventional Commits with emoji appears common in history (example: `feat: :sparkles: ...`, `fix: :bug: ...`).
- Do not push/merge unless operator explicitly asks.

## Steps

### Step 1: Introduce a shared strict API base URL resolver

Create a small shared resolver module for intake services (or colocated helper in `src/features/intake/services/`) that:

- reads `import.meta.env.VITE_CANOPY_API_BASE_URL`,
- trims whitespace and trailing slash,
- throws a clear error when missing/blank,
- returns normalized string otherwise.

Replace duplicate `getApiBaseUrl()` logic in tree/story services with this helper.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Update service call sites to fail fast on missing configuration

Ensure `createTree` and `createStory` now fail before `fetch` when API base URL is not configured. Keep existing error semantics for non-OK HTTP responses.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` → all pass.

### Step 3: Add env typing and operator docs

- Add `VITE_CANOPY_API_BASE_URL?: string` to `ImportMetaEnv`.
- Update `.env.sample` to include `VITE_CANOPY_API_BASE_URL=`.
- Update README setup section with:
  - required API base URL for tree/story writes,
  - example value for local backend,
  - expected behavior when missing (explicit error shown in flow).

**Verify**: `pnpm lint` → no new errors; `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` passes.

## Test plan

- Add/adjust service-level tests (new file if absent): verify missing `VITE_CANOPY_API_BASE_URL` throws deterministic error for both `createTree` and `createStory`.
- Reuse assertion style from `src/features/intake/components/TreeStoryFlowPanel.test.tsx`.
- Keep network mocked; do not hit real API.

## Done criteria

- [ ] `VITE_CANOPY_API_BASE_URL` is explicitly typed and documented.
- [ ] Tree/story service calls fail fast with clear error when base URL missing.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0 (no new lint errors introduced).
- [ ] Targeted intake flow tests pass.
- [ ] No files outside in-scope list are modified.

## STOP conditions

- Drift check shows significant changes in either service file and current logic no longer matches excerpts.
- Existing tests depend on implicit empty-base fallback and changing that would require backend feature work.
- Missing env at runtime is handled globally elsewhere (e.g., app bootstrap) and this plan would duplicate/conflict with that mechanism.

## Maintenance notes

- Any future intake API endpoints should reuse the same base URL resolver to avoid drift.
- In review, scrutinize error-message clarity shown to users when env is missing.
- Follow-up intentionally deferred: centralizing all app env validation at bootstrap for every feature, not just intake writes.


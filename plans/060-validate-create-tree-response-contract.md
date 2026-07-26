# Plan 060: Validate create-tree API response contract before state updates

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c451b46..HEAD -- src/features/intake/services/treeService.ts src/features/intake/services/storyService.ts src/features/intake/components/TreeStoryFlowPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/050-enforce-api-base-url-configuration.md`
- **Category**: bug
- **Planned at**: commit `c451b46`, 2026-07-25

## Why this matters

`createTree` currently casts JSON directly to `CreateTreeResponse` and then writes that data into runtime map state. If the API returns incompatible payloads (missing fields, wrong types, alternate names), the app either fails later in UI logic or stores invalid data. `createStory` already uses Zod response parsing, so tree creation should follow the same reliability pattern.

## Current state

- `src/features/intake/services/treeService.ts` — tree response currently unchecked.
- `src/features/intake/services/storyService.ts` — existing response validation pattern.
- `src/features/intake/components/TreeStoryFlowPanel.tsx` — consumes `createTree` and updates map runtime.

Current excerpts:

- `src/features/intake/services/treeService.ts:15-20`
  - `CreateTreeResponse` type exists but is only compile-time.
- `src/features/intake/services/treeService.ts:61-62`
  - `const responseData = (await response.json()) as CreateTreeResponse;`
- `src/features/intake/components/TreeStoryFlowPanel.tsx:91-101`
  - successful `createTree` output is immediately committed to runtime/UI state.
- `src/features/intake/services/storyService.ts:17-20,58-67`
  - established `zod` safe-parse pattern for API response validation.

Repo conventions to follow:

- Use `zod` schemas for runtime shape checks at API boundaries.
- Throw explicit user-facing errors on invalid server payloads (`"Add story failed: invalid server response."` pattern).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` | all pass |

## Scope

**In scope**:

- `src/features/intake/services/treeService.ts`
- `src/features/intake/components/TreeStoryFlowPanel.test.tsx` (if behavior assertions need updates)
- optional new test file for tree service (recommended): `src/features/intake/services/treeService.test.ts`

**Out of scope**:

- `createStory` behavior changes beyond keeping parity of error messaging style
- Map rendering internals
- Any API contract change on backend

## Git workflow

- Branch: `advisor/060-validate-create-tree-response`
- Use repo’s existing commit style (conventional commits seen in recent history).
- Do not push or merge unless asked.

## Steps

### Step 1: Add runtime schema for create-tree response

In `treeService.ts`, define a Zod schema equivalent to expected payload:

- `id: string | number`
- `latitude: number`
- `longitude: number`
- `isAlive: boolean`

Parse JSON as `unknown`, validate with `safeParse`, and throw a deterministic error when invalid.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Preserve existing success and HTTP-failure behavior

Keep existing `!response.ok` error formatting unchanged. Only tighten handling of malformed successful payloads.

Use message parallel to story service, e.g. `"Add tree failed: invalid server response."`.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` → pass.

### Step 3: Add service-level contract tests

Create targeted tests for `createTree`:

- valid payload parses to normalized `CreatedTree`.
- malformed payload throws invalid-response error.
- non-OK response still throws status/body error.

Mock `fetch` per existing vitest patterns.

**Verify**: `pnpm test -- src/features/intake/services/treeService.test.ts` → pass.

## Test plan

- Model service tests after existing intake test style (clear setup/assert teardown).
- Cover both runtime-validated failures and transport failures.
- Ensure no real network calls.

## Done criteria

- [ ] `createTree` validates response JSON at runtime before mapping to state.
- [ ] Invalid payloads throw explicit `Add tree failed: invalid server response.` error.
- [ ] Existing transport error behavior remains unchanged.
- [ ] Service tests cover success + malformed payload + non-OK response.
- [ ] `pnpm typecheck`, `pnpm lint`, and relevant tests pass.

## STOP conditions

- Drift check indicates the API payload schema changed (for example nested payload object), requiring product/API confirmation.
- Existing tests prove downstream code intentionally tolerates incomplete tree payloads.
- Service test harness cannot mock `fetch` without introducing unrelated global test framework changes.

## Maintenance notes

- Keep tree/story response-validation behavior aligned; if one schema evolves, update both deliberately.
- Reviewer should verify no broad `catch` blocks were introduced and no errors were silently swallowed.


# Plan 070: Add API integration-style tests for intake tree/story submission flow

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c451b46..HEAD -- src/features/intake/components/TreeStoryFlowPanel.tsx src/features/intake/components/TreeStoryFlowPanel.test.tsx src/features/intake/components/TreeStoryFlowPanel.search.test.tsx src/features/intake/services/treeService.ts src/features/intake/services/storyService.ts src/test/setup.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/050-enforce-api-base-url-configuration.md`, `plans/060-validate-create-tree-response-contract.md`
- **Category**: tests
- **Planned at**: commit `c451b46`, 2026-07-25

## Why this matters

Current intake tests mostly validate UI transitions and map-state toggles with mocked runtime methods. They do not verify end-to-end tree-then-story submission semantics at the component boundary with API service outcomes. As a result, API integration regressions (request sequencing, surfaced error messages, disabled states during submit) can ship undetected. This plan closes that gap with deterministic integration-style tests.

## Current state

- `src/features/intake/components/TreeStoryFlowPanel.tsx` — orchestrates tree creation then story creation.
- `src/features/intake/components/TreeStoryFlowPanel.test.tsx` — currently mocks `createTree`; does not fully exercise `createStory` submission in same scenario.
- `src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` — search-only behavior.
- `src/test/setup.ts` — minimal global setup; no shared network mock utilities.

Current excerpts:

- `TreeStoryFlowPanel.tsx:82-107`
  - new-tree path calls `createTree`, then sets selected tree id and enters story form.
- `TreeStoryFlowPanel.tsx:110-135`
  - story form submit calls `createStory`, then transitions to success.
- `TreeStoryFlowPanel.test.tsx:123-150`
  - validates `createTree` call and story form visibility, but does not submit story form and assert `createStory` behavior.

Repo conventions to follow:

- Tests use `@testing-library/react` + `userEvent` + explicit DOM assertions.
- Runtime dependencies are mocked with `vi.mock(...)` + `vi.hoisted(...)` where needed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Target tests | `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` | all pass |
| Full tests | `pnpm test` | all pass |

## Scope

**In scope**:

- `src/features/intake/components/TreeStoryFlowPanel.test.tsx`
- `src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` (only if shared mocks/utils require adjustment)
- optional shared test utility additions under `src/test/` for API mocks

**Out of scope**:

- Production flow logic changes in `TreeStoryFlowPanel.tsx` unless tests reveal a real bug
- Backend API implementation
- Broader test framework migration (e.g., introducing MSW for whole repo)

## Git workflow

- Branch: `advisor/070-intake-api-integration-tests`
- Commit style consistent with repo history.
- Do not push/merge unless asked.

## Steps

### Step 1: Expand tree+story happy-path test to cover full submit sequence

In `TreeStoryFlowPanel.test.tsx`:

- Mock both `createTree` and `createStory`.
- Drive UI through:
  1. new tree path,
  2. map location set,
  3. continue to story form,
  4. fill required story fields,
  5. submit story.
- Assert:
  - `createTree` called once with selected coordinates,
  - `createStory` called with created tree id and submitted fields,
  - success state rendered.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx` → pass.

### Step 2: Add error-path tests for API failures

Add targeted tests for:

- tree create failure surfaces API error and does not advance to story form.
- story create failure surfaces API error and remains on story form for retry.

Use explicit assertions on error text and flow step heading.

**Verify**: `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx --reporter=verbose` → all tests pass.

### Step 3: Stabilize mocking boundaries and cleanup

Ensure tests reset both tree/story mocks between cases and do not leak state across tests. Keep search-behavior tests independent and passing.

**Verify**:

- `pnpm test -- src/features/intake/components/TreeStoryFlowPanel.test.tsx src/features/intake/components/TreeStoryFlowPanel.search.test.tsx` → pass.
- `pnpm test` → all pass.

## Test plan

- Extend existing panel test file instead of introducing unrelated new suites.
- Include minimum cases:
  - full happy path (tree create + story create + success),
  - tree API failure,
  - story API failure.
- Keep assertions user-visible (headings, error text, success status) and call-level (`toHaveBeenCalledWith`).

## Done criteria

- [ ] Full new-tree + story-submit sequence is covered by automated test.
- [ ] Tree API failure and story API failure are each covered and asserted.
- [ ] Tests verify no incorrect step progression on failure.
- [ ] Targeted intake tests pass.
- [ ] Full repo test suite passes.
- [ ] No out-of-scope files modified.

## STOP conditions

- Drift check shows panel flow steps/messages changed enough that tests in this plan no longer map cleanly.
- Existing tests already cover this scope in another file (avoid duplicate coverage; report and reconcile).
- Error text is intentionally localized or dynamically generated in a way that makes direct string assertions brittle; report and request i18n-safe assertion strategy.

## Maintenance notes

- Keep component-level API-flow tests synchronized with service contract changes from Plans 050/060.
- Reviewer should inspect that tests are not over-mocked to the point of losing behavior value.


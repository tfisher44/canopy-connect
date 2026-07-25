# Plan 090: Remediate React Router high-severity advisory safely

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c451b46..HEAD -- package.json pnpm-lock.yaml src/main.tsx src/app/App.tsx src/app/App.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c451b46`, 2026-07-25

## Why this matters

`pnpm audit --prod --audit-level high` reports a high advisory on `react-router` via `react-router-dom` (`>=7.12.0 <8.3.0`). Even if this app currently uses client-side routing (not RSC actions), unresolved high-severity advisories increase supply-chain risk and future migration friction. Remediation should be deliberate because the patched range is a major version jump.

## Current state

- `package.json` pins `react-router-dom` at `^7.18.1`.
- `src/main.tsx` uses `BrowserRouter`.
- `src/app/App.tsx` uses route declarations only (no server action wiring).
- Current audit output indicates patched versions begin at `>=8.3.0`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `pnpm install` | exit 0 |
| Audit check | `pnpm audit --prod --audit-level high` | no high finding for react-router |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test` | all pass |

## Scope

**In scope**:

- `package.json`
- `pnpm-lock.yaml`
- Router usage files only if required by upgrade:
  - `src/main.tsx`
  - `src/app/App.tsx`
  - `src/app/App.test.tsx`

**Out of scope**:

- Broad app architecture changes
- Backend/auth model changes

## Steps

### Step 1: Upgrade react-router-dom to patched major and install

Bump `react-router-dom` (and aligned `react-router` transitive version) to a patched release (`>=8.3.0`) using package manager update flow.

**Verify**: dependency graph resolves and `pnpm install` exits 0.

### Step 2: Adapt any breaking router API changes

If v8 introduces breaking changes used by this app, update only the minimal routing code in scope files while preserving route behavior:

- `/`, `/map`, `/form`, `/style-guidelines/components`, fallback route.

**Verify**: `pnpm typecheck` and `pnpm test -- src/app/App.test.tsx` pass.

### Step 3: Re-run security and full verification gates

Confirm advisory is cleared and full quality gates still pass.

**Verify**:

- `pnpm audit --prod --audit-level high` has no high advisory for react-router.
- `pnpm lint` passes.
- `pnpm test` passes.

## Test plan

- Reuse existing route behavior tests in `src/app/App.test.tsx`.
- Add/adjust tests only if upgrade changes public behavior in route rendering.
- Keep assertions around route compatibility and state persistence across route changes.

## Done criteria

- [ ] React Router advisory is remediated or explicitly documented as unreachable with maintainers’ decision.
- [ ] Route behavior remains unchanged from current tests.
- [ ] Full lint/typecheck/test pass.
- [ ] No files outside scope changed.

## STOP conditions

- Upgrade requires broad migration beyond scoped files.
- Advisory cannot be cleared without framework-level changes not yet planned.
- Tests reveal user-visible route regression that cannot be fixed without architectural changes.

## Maintenance notes

- If remediation is blocked by migration complexity, create a follow-up migration plan with explicit timeline and temporary risk acceptance note in docs.


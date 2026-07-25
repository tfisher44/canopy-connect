# Plan 001: Make ribbon and hero layout responsive and stable

> **Executor instructions**: Follow this plan exactly. Run every verification command before moving on. If a STOP condition occurs, stop and report; do not improvise.
>
> **Drift check (run first)**:  
> `git diff --stat 68fa144..HEAD -- src/index.css src/components/ui/AppRibbon.tsx src/app/layout/AppShell.tsx`  
> If drift changes the structures cited below, stop and request plan refresh.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `68fa144`, 2026-07-24

## Why this matters

Ribbon and hero layout sizing are currently hard-coded and tightly coupled. On smaller viewports, this can cause clipping, overlap, and inconsistent vertical rhythm. Stabilizing this first prevents downstream styling/accessibility work from being built on brittle layout math.

## Current state

- `src/index.css` controls ribbon height, content offsets, and hero min-height.
- `src/components/ui/AppRibbon.tsx` renders the fixed header controls.
- `src/app/layout/AppShell.tsx` composes the shell and depends on ribbon layout assumptions.

Relevant excerpts:

- `src/index.css:28`  
  `--header-height: 6.4rem;`
- `src/index.css:293-299`  
  `.runtime-shell__content { ... padding-top: calc(var(--header-height) + 0.85rem); }`
- `src/index.css:306`  
  `min-height: calc(100vh - var(--header-height) - 8.25rem);`
- `src/index.css:340-347`  
  `.app-ribbon { position: fixed; ... height: var(--header-height); ... }`
- `src/index.css:648-651`  
  `@media (max-width: 900px) { :root { --header-height: 7.25rem; } }`

Repo conventions:

- Global styling is CSS-variable driven in `src/index.css`.
- Component wrappers are thin and semantic (`src/components/ui/AppRibbon.tsx`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**
- `src/index.css`
- `src/components/ui/AppRibbon.tsx`
- `src/app/layout/AppShell.tsx`

**Out of scope**
- Theme token values unrelated to layout sizing
- Style-guidelines feature logic/data code

## Git workflow

- Branch: `advisor/001-ribbon-hero-responsive-stability`
- Commit style: Conventional Commits (`feat:`, `refactor:`) per recent history
- Do not push/open PR unless explicitly requested by operator

## Steps

### Step 1: Introduce safer responsive ribbon sizing model

Replace rigid one-size header logic with responsive sizing tokens and bounded title sizing:
- Add desktop/tablet/mobile ribbon tokens.
- Avoid large jumps that force content reflow.

**Verify**: `pnpm lint` → exit 0

### Step 2: Replace hero `100vh` math with viewport-safe behavior

Use safer viewport units (`svh`/`dvh`) or fallback strategy to prevent mobile chrome clipping.
Ensure hero stays prominent but never forces overflow due to ribbon size shifts.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Align AppShell spacing contract to ribbon sizing

Ensure shell top padding tracks final ribbon height token consistently.
Confirm panel-open and panel-closed states preserve hero integrity.

**Verify**: `pnpm test` → all pass

### Step 4: Visual smoke for key breakpoints

Manual check at ~1440px, ~1024px, ~768px, ~390px:
- Ribbon fully visible
- Controls not clipped
- Hero remains usable and framed

**Verify**: `pnpm build` → exit 0

## Test plan

- Reuse existing shell tests (`src/app/App.test.tsx`) for structural assertions.
- Add/adjust tests only if rendering contract changes materially.
- Manual breakpoint validation is mandatory for this plan.

## Done criteria

- [ ] Ribbon and hero no longer rely on brittle `100vh - constant` behavior.
- [ ] No clipping/overlap for ribbon controls at target breakpoints.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] No files outside in-scope list modified.
- [ ] `advisor-plans/README.md` status updated.

## STOP conditions

- Drift check mismatches cited layout blocks.
- Fix requires touching feature-domain logic outside shell/ribbon/layout CSS.
- Breakpoint verification reveals unresolved overlap after two attempts.

## Maintenance notes

- Any future title font size increase must be validated against the ribbon-height token matrix.
- Reviewers should focus on mobile hero visibility and fixed-header stacking behavior.


# Plan 004: Refactor theme styling into modular token and component layers

> **Executor instructions**: Refactor only; no behavior changes unless explicitly required for parity. Validate parity with existing UI states.
>
> **Drift check (run first)**:  
> `git diff --stat 68fa144..HEAD -- src/index.css src/components/ui/AppRibbon.tsx src/app/layout/AppShell.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: advisor-plans/001-ribbon-hero-responsive-stability.md, advisor-plans/002-light-mode-control-contrast.md
- **Category**: tech-debt
- **Planned at**: commit `68fa144`, 2026-07-24

## Why this matters

`src/index.css` currently combines tokens, theme variants, layout, controls, hero, and feature styles in one large file. This slows iteration, increases merge conflicts, and raises regression risk.

## Current state

- `src/index.css` holds:
  - base tokens (`:root`)
  - theme variants (`:root[data-theme="..."]`)
  - mode variants (`:root[data-mode="light"]`)
  - component styles (ribbon/button/toggles)
  - feature styles (style-compliant list)

Representative excerpts:

- Theme blocks: `src/index.css:31-155`
- Mode block: `src/index.css:157-176, 569-646`
- Ribbon/control blocks: `src/index.css:340-448`

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**
- `src/index.css` (split/refactor)
- New CSS files under `src/styles/` (for tokens/themes/components/layout)
- `src/main.tsx` (imports order only, if needed)

**Out of scope**
- JS theme state logic (`src/theme/*.ts*`)
- Behavioral redesign of components

## Steps

### Step 1: Create modular CSS structure

Split into predictable layers, for example:
- `src/styles/tokens.css`
- `src/styles/themes.css`
- `src/styles/layout.css`
- `src/styles/components.css`
- `src/styles/feature-style-guidelines.css`

Keep source order deterministic.

**Verify**: `pnpm lint` → exit 0

### Step 2: Move rules without changing visual output

Port rules in logical groups. Avoid mixing refactor and restyling in same commit.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Rewire imports and validate parity

Update stylesheet imports to preserve cascade and specificity.

**Verify**: `pnpm test` and `pnpm build` → pass

## Test plan

- Existing unit tests should continue passing unchanged.
- Manual parity pass:
  - all themes
  - dark/light mode
  - panel open/closed

## Done criteria

- [ ] `index.css` is reduced to minimal import shell (or intentionally retained with clear layer boundaries).
- [ ] Theme/mode behavior remains unchanged from pre-refactor baseline.
- [ ] No selector-specificity regressions visible in ribbon/controls/hero/list.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- [ ] Only in-scope files changed.
- [ ] `advisor-plans/README.md` status updated.

## STOP conditions

- Visual parity cannot be maintained without selector rewrites across app code.
- Unexpected cascade conflicts require touching many unrelated components.

## Maintenance notes

- Future theme additions should require edits mainly in `themes.css` and minimal component overrides.


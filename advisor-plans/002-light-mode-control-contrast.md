# Plan 002: Increase control readability and contrast in light mode

> **Executor instructions**: Follow this plan step by step. Verify each step before continuing. Stop on STOP conditions.
>
> **Drift check (run first)**:  
> `git diff --stat 68fa144..HEAD -- src/index.css src/components/ui/AppRibbon.tsx`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: advisor-plans/001-ribbon-hero-responsive-stability.md
- **Category**: bug
- **Planned at**: commit `68fa144`, 2026-07-24

## Why this matters

Light mode currently uses layered `color-mix` styling that can produce low-clarity control states. Primary/secondary/theme controls should have clear hierarchy and stronger legibility while preserving theme accents.

## Current state

- Light mode overrides are in `src/index.css:592-646`.
- Controls covered:
  - `.button`, `.button--ghost`, `.button--neon`
  - `.theme-switcher__select`
  - `.mode-toggle`, `.mode-toggle__item`

Evidence excerpts:

- `src/index.css:592-603` (light-mode primary button)
- `src/index.css:605-621` (light-mode secondary/neon)
- `src/index.css:623-636` (light-mode dropdown/toggle surface)

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

**Out of scope**
- Dark mode control styling
- Structural layout/ribbon geometry
- Theme provider logic

## Steps

### Step 1: Normalize control surface hierarchy in light mode

Ensure visual order is unambiguous:
- Primary > Neon > Ghost (or documented alternative)
- Keep all surfaces theme-tinted, not neutral gray/ashy.

**Verify**: `pnpm lint` → exit 0

### Step 2: Improve text legibility in controls

Tune control text color for contrast consistency against all light-mode theme variants.

**Verify**: `pnpm test` → all pass

### Step 3: Tune hover/focus states for perceptible transitions

Improve affordances without introducing noisy glow in light mode.

**Verify**: `pnpm build` → exit 0

## Test plan

- Manual visual pass for each theme in light mode:
  - Aurora, Canopy Dusk, Sunset Neon, Midnight Bloom, Ember Mist, Verdant Glow
- Confirm button hierarchy and readability in each.

## Done criteria

- [ ] Primary and secondary are clearly distinguishable in light mode.
- [ ] Theme dropdown and mode toggle have readable text + non-ashy surfaces.
- [ ] All six themes remain visually coherent in light mode.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- [ ] Only in-scope file changed.
- [ ] `advisor-plans/README.md` status updated.

## STOP conditions

- Any required fix needs JS/TS logic changes outside CSS.
- Theme-specific regressions can’t be resolved with shared light-mode tokens.

## Maintenance notes

- Future themes should only need token updates, not new control-class branches.


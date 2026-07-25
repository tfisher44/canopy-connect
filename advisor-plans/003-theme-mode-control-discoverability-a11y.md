# Plan 003: Improve theme/mode control discoverability and keyboard UX

> **Executor instructions**: Follow this plan exactly; do not improvise around scope. Verify each step.
>
> **Drift check (run first)**:  
> `git diff --stat 68fa144..HEAD -- src/components/ui/AppRibbon.tsx src/index.css`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: advisor-plans/001-ribbon-hero-responsive-stability.md
- **Category**: dx
- **Planned at**: commit `68fa144`, 2026-07-24

## Why this matters

After removing visible labels, theme and mode controls are compact but less discoverable. Improving affordance and keyboard feedback reduces confusion and makes appearance iteration smoother.

## Current state

- Theme dropdown has `aria-label` but no visible cue text (`AppRibbon.tsx:34-53`).
- Mode control uses Radix toggle group (`AppRibbon.tsx:54-72`).
- Control visuals are defined in `index.css:377-448`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**
- `src/components/ui/AppRibbon.tsx`
- `src/index.css`

**Out of scope**
- Theme palette token values
- Route/layout behavior

## Steps

### Step 1: Add compact but visible affordance cues

Introduce minimal visual cueing (iconography or concise text treatment) that does not crowd ribbon layout.

**Verify**: `pnpm lint` → exit 0

### Step 2: Strengthen focus-visible and active states

Improve keyboard navigation confidence for:
- theme `<select>`
- Radix mode toggles

**Verify**: `pnpm test` → all pass

### Step 3: Validate accessible naming consistency

Ensure control names are understandable in screen readers and visible UX aligns with control function.

**Verify**: `pnpm build` → exit 0

## Test plan

- Manual keyboard test:
  - Tab through ribbon controls
  - Confirm focus ring clarity
  - Toggle mode and theme without pointer
- If needed, add lightweight RTL assertions for focusable control presence.

## Done criteria

- [ ] Theme and mode controls are visually discoverable at first glance.
- [ ] Focus-visible states are clear for keyboard users.
- [ ] No ribbon overflow/clipping introduced.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- [ ] No out-of-scope files changed.
- [ ] `advisor-plans/README.md` status updated.

## STOP conditions

- Any discoverability change requires expanding ribbon height beyond limits set by Plan 001.
- Accessibility improvements require introducing new libraries.

## Maintenance notes

- Keep cues compact; ribbon is a high-density region and should avoid verbose labels.


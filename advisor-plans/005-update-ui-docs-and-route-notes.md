# Plan 005: Update docs to match live UI routes and appearance system

> **Executor instructions**: Update docs only. Keep this plan strictly documentation-focused.
>
> **Drift check (run first)**:  
> `git diff --stat 68fa144..HEAD -- README.md src/app/App.tsx src/components/ui/AppRibbon.tsx src/theme/themes.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: advisor-plans/001-ribbon-hero-responsive-stability.md, advisor-plans/002-light-mode-control-contrast.md, advisor-plans/003-theme-mode-control-discoverability-a11y.md
- **Category**: docs
- **Planned at**: commit `68fa144`, 2026-07-24

## Why this matters

README still describes old route semantics and does not document the theme+mode system now central to the UI. Keeping docs aligned reduces onboarding confusion and avoids stale expectations.

## Current state

- `README.md:10-14` lists routes as Home/Form/Map.
- App now includes style-guidelines route and fixed ribbon appearance controls:
  - `src/app/App.tsx` includes `/style-guidelines/components`
  - `src/components/ui/AppRibbon.tsx` includes theme dropdown and mode toggle
  - `src/theme/themes.ts` defines available themes and defaults

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope**
- `README.md`

**Out of scope**
- Any TSX/CSS source files
- Route behavior changes

## Steps

### Step 1: Update route documentation

Document current route mapping and note compatibility routes if still present.

**Verify**: manual read-through against `src/app/App.tsx`

### Step 2: Add appearance controls section

Document:
- available themes
- dark/light mode toggle
- defaults (light + verdant-glow)
- persistence behavior (localStorage)

**Verify**: manual read-through against `src/theme/themes.ts` and `ThemeContext.tsx`

### Step 3: Update UI architecture note

Add a short section describing fixed ribbon + map hero + sidebar layout model.

**Verify**: `pnpm test` → all pass (sanity check no accidental source edits)

## Test plan

- Docs-only task; no new tests required.
- Ensure no non-doc file changed in git status.

## Done criteria

- [ ] README route section reflects current app behavior.
- [ ] README includes theme and mode control documentation.
- [ ] README mentions current visual shell structure.
- [ ] No file except `README.md` changed.
- [ ] `advisor-plans/README.md` status updated.

## STOP conditions

- Route behavior differs from `App.tsx` and cannot be described without code changes.

## Maintenance notes

- Keep README appearance section synchronized with `src/theme/themes.ts` when adding/removing themes.


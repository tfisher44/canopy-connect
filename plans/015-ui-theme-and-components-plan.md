# Plan: UI Theme and Component System Increment

**Generated**: 2026-07-24  
**Estimated Complexity**: Medium

## Overview
Create a reusable UI component set for a dark, glassmorphic, matte visual style using Radix/shadcn primitives with custom class-name styling.  
This increment provides a consistent design system for the map shell, title ribbon, search bar wrapper, and add-story sidebar form UI.

## Prerequisites
- `010-foundation-map-runtime-plan.md` complete
- Single-page shell regions available (header, map, sidebar)
- Existing CSS build pipeline in Vite

## Component Inventory (Build Contract)

| Component | Location | Purpose | Key Props | States | Depends On |
| --- | --- | --- | --- | --- | --- |
| `AppRibbon` | `src/components/ui/app-ribbon.tsx` | Top title ribbon with app name | `title`, `subtitle?`, `actions?`, `className?` | `default`, `compact` | tokens + utilities |
| `SearchShell` | `src/components/ui/search-shell.tsx` | Glassmorphic container for map search | `children`, `pinned?`, `className?` | `idle`, `focused`, `disabled` | tokens + utilities |
| `MapSearchControl` | `src/features/map/ui/MapSearchControl.tsx` | Search input/ArcGIS search wiring for zoom-to | `mapView`, `placeholder?`, `onResult?`, `className?` | `idle`, `searching`, `error` | `SearchShell`, map context |
| `GlassPanel` | `src/components/ui/glass-panel.tsx` | Generic translucent surface for overlays/cards | `children`, `tone?`, `elevation?`, `className?` | `default`, `hover`, `active` | tokens + utilities |
| `MatteSidebar` | `src/components/ui/matte-sidebar.tsx` | Hidable right sidebar for Add Story flow | `open`, `onOpenChange`, `widthMode?`, `children`, `className?` | `closed`, `opening`, `open`, `closing` | Radix sheet/drawer + tokens |
| `SectionHeader` | `src/components/ui/section-header.tsx` | Consistent section headers in forms/panels | `title`, `description?`, `actions?`, `className?` | `default`, `dense` | tokens + typography styles |
| `StoryFormCard` | `src/features/editing/ui/StoryFormCard.tsx` | Matte/glass container around story form controls | `children`, `title`, `description?`, `status?` | `idle`, `submitting`, `error`, `success` | `GlassPanel`, `SectionHeader` |
| `SidebarToggleButton` | `src/components/ui/sidebar-toggle-button.tsx` | Open/close right sidebar from map view | `open`, `onToggle`, `label?`, `className?` | `closed`, `open`, `disabled` | tokens + utilities |
| `LayoutModeProvider` | `src/app/layout/LayoutModeProvider.tsx` | Controls single-page layout mode and `3fr/1fr` split | `mode`, `children` | `map-only`, `form-open` | add-flow state |
| `AppShell` (integration) | `src/app/layout/AppShell.tsx` | Composes ribbon, search, map canvas, and sidebar into one page | `map`, `sidebar`, `header`, `search` slots | `map-only`, `form-open` | all components above |

### Standard Width Behavior
- `map-only`: map occupies full width, sidebar hidden.
- `form-open`: CSS grid uses `grid-template-columns: 3fr 1fr` (75% map / 25% sidebar).
- Sidebar remains hidable; closing it always returns to `map-only`.

### Styling Rules
- Use Radix/shadcn primitives for behavior/accessibility.
- Use custom class names for all visual styling (no one-off inline style objects except dynamic geometry).
- Token-first styling: components consume `tokens.css` variables rather than hardcoded colors.

## Sprint 1: Design Tokens and Theme Contract
**Goal**: Define visual system primitives to avoid one-off styles.
**Demo/Validation**:
- Theme tokens render dark/glass/matte baseline across shell regions

### Task 1.1: Define dark theme and glass/matte tokens
- **Location**:
  - `src/styles/tokens.css`
  - `src/index.css`
- **Description**: Add CSS custom properties for surfaces, blur, border alpha, shadow, typography, and accent states.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Token names are semantic and reusable
  - Contrast remains readable in dark theme
- **Validation**:
  - Visual review against map backdrop

### Task 1.2: Add utility class conventions for custom styling
- **Location**:
  - `src/styles/utilities.css`
- **Description**: Define project-specific class names for glass panel, matte card, ribbon, and interactive states.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Utilities avoid inline-style duplication
  - Class naming is consistent with repo conventions
- **Validation**:
  - Component snapshot/DOM class assertion tests

## Sprint 2: Radix/shadcn Primitive Wrappers
**Goal**: Build reusable themed components with custom class names.
**Demo/Validation**:
- Shared components render consistently in shell and form panel

### Task 2.1: Create themed panel/sheet primitives
- **Location**:
  - `src/components/ui/glass-panel.tsx`
  - `src/components/ui/matte-sidebar.tsx`
- **Description**: Wrap Radix/shadcn primitives and apply custom classes for translucent/matte treatments.
- **Dependencies**: Sprint 1 complete
- **Acceptance Criteria**:
  - Sidebar supports hidden/open states
  - Theme classes are applied via component API, not ad-hoc per screen
- **Validation**:
  - Component tests for open/closed state classes

### Task 2.2: Create themed app ribbon and section headers
- **Location**:
  - `src/components/ui/app-ribbon.tsx`
  - `src/components/ui/section-header.tsx`
- **Description**: Implement app name title ribbon and reusable panel/header variants with dark glass styling.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Ribbon overlays map without blocking interaction unexpectedly
  - Header variants are reusable in add-story forms
- **Validation**:
  - Visual smoke check + basic render tests

### Task 2.3: Create themed search-shell container
- **Location**:
  - `src/components/ui/search-shell.tsx`
  - `src/features/map/ui/MapSearchControl.tsx`
- **Description**: Build top-left search container that wraps map search control with themed glassmorphic shell.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Search shell remains readable over map imagery
  - Positioning stays top-left within single-page layout
- **Validation**:
  - Manual positioning check in desktop viewport

## Sprint 3: Apply Theme Components to Shell and Add Story UI
**Goal**: Replace raw placeholders with reusable themed components.
**Demo/Validation**:
- Header, search area, and sidebar form panel all use shared themed primitives

### Task 3.1: Integrate themed components into AppShell
- **Location**:
  - `src/app/layout/AppShell.tsx`
- **Description**: Use themed ribbon, search shell, and sidebar wrappers in the shell layout.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - AppShell reflects final style direction without custom one-off local CSS
  - Sidebar remains hidable and supports 3fr/1fr open-state split
- **Validation**:
  - UI test for class presence + manual visual pass

## Testing Strategy
- Component render tests for wrappers and stateful classes
- Manual visual QA against map backgrounds for readability and contrast

## Potential Risks & Gotchas
- Backdrop blur can impact performance on lower-end devices
- Overly translucent surfaces can reduce text contrast

## Rollback Plan
- Keep theme wrappers isolated so shell can fallback to plain containers quickly
- Roll back token/utilities files independently from behavior logic

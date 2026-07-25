# Plan: Foundation Map Runtime Increment

**Generated**: 2026-07-24  
**Estimated Complexity**: Medium

## Overview
Establish the application shell, map lifecycle boundaries, env validation, layer resolution, and runtime schema discovery.  
Outcome: a stable map runtime that can safely power editing features in the next increment.
This increment also sets the **single-page layout contract** needed for a 75% map / 25% form split when Add Story is open.

## Prerequisites
- `@arcgis/core` already installed
- WebMap ID and editable layer title available
- Existing app entrypoint in `src/main.tsx`

## Sprint 1: App Shell + Context
**Goal**: Render a production-shaped layout with map context ownership.
**Demo/Validation**:
- App shell displays map area and right-panel placeholder
- Map loading state visible in UI
- Shell supports a single-page two-column mode that can switch to `3fr 1fr`
- Header ribbon is visible with app title
- Top-left search slot/anchor is present for location zoom
- Right panel is collapsible (hidden by default, opened by workflow)

### Task 1.1: Create app shell layout regions
- **Location**:
  - `src/app/App.tsx`
  - `src/app/layout/AppShell.tsx`
- **Description**: Implement layout regions for full-page map canvas, title ribbon, top-left control anchor, and hidable workflow panel.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Layout regions render consistently on desktop viewport
  - App remains routing-safe for future routes
  - Layout supports a toggled `map:panel = 3:1` split without route/page navigation
  - Default state keeps panel collapsed while map spans full width
- **Validation**:
  - Manual check in `pnpm dev`

### Task 1.2: Introduce map runtime context
- **Location**:
  - `src/map/context/MapContext.tsx`
  - `src/map/hooks/useMapView.ts`
- **Description**: Add provider and hooks for `webMap`, `mapView`, `ready/error/loading` status.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Consumers can read map runtime state without prop drilling
  - Error status is typed and surfaced
- **Validation**:
  - Unit tests for provider state transitions

## Sprint 2: Config + Layer Resolution
**Goal**: Safely resolve target editable layer at runtime.
**Demo/Validation**:
- Missing env causes actionable failure
- Valid config resolves expected layer by title

### Task 2.1: Add env parsing and validation
- **Location**:
  - `src/config/env.ts`
  - `src/vite-env.d.ts` (or existing env typing file)
- **Description**: Parse and validate `VITE_ARCGIS_WEBMAP_ID` and `VITE_ARCGIS_EDIT_LAYER_TITLE`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Invalid/missing env fails loudly
  - Consumers receive typed config object
- **Validation**:
  - Unit tests for valid/invalid branches

### Task 2.2: Implement WebMap loader service
- **Location**:
  - `src/map/services/loadWebMap.ts`
- **Description**: Isolate WebMap creation/loading from UI components.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Loader returns ready WebMap or explicit error
- **Validation**:
  - Service-level tests with mocked failures

### Task 2.3: Resolve editable feature layer with capability checks
- **Location**:
  - `src/map/services/resolveEditableLayer.ts`
  - `src/map/types/layers.ts`
- **Description**: Find layer by title, verify FeatureLayer type and create capability.
- **Dependencies**: Tasks 2.1, 2.2
- **Acceptance Criteria**:
  - Fails on type mismatch or missing create permission
  - Returns typed layer handle when valid
- **Validation**:
  - Unit tests for success/failure matrix

## Sprint 3: Schema Discovery for Unknown Fields
**Goal**: Derive required field contract from live layer metadata.
**Demo/Validation**:
- App can list required editable fields from layer metadata
- Non-editable/system fields are excluded

### Task 3.1: Build editable schema discovery service
- **Location**:
  - `src/features/editing/services/discoverEditableSchema.ts`
  - `src/features/editing/types/layerSchema.ts`
- **Description**: Inspect layer field metadata and emit required/optional editable field model.
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - Required fields are accurately identified
  - Output model is consumable by form builder in Increment 020
- **Validation**:
  - Unit tests for representative field metadata cases

## Testing Strategy
- Unit tests for env parser, loader, layer resolver, and schema discovery
- Manual smoke test of map load and error display

## Potential Risks & Gotchas
- Layer title collisions in WebMap
- Capability metadata present but misleading due to portal permissions

## Rollback Plan
- Keep shell and context changes isolated from editing feature code
- Revert Sprint 3 first, then Sprint 2, then Sprint 1 if needed

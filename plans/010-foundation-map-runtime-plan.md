# Plan: Foundation Map Runtime Increment

**Generated**: 2026-07-24  
**Last Updated**: 2026-07-24  
**Estimated Complexity**: Medium

## Status
- **Overall**: Not Started
- **Owner**: TBD
- **Current Sprint**: none
- **Delivery Style**: one commit per task, each sprint demoable

## Overview
Implement the runtime foundation for the editable-map MVP using the existing 010 scope only:
1. single-page shell contract (map-first, collapsible right panel, future 3:1 split),
2. map runtime ownership via context,
3. validated env-driven map/layer resolution,
4. editable schema discovery for the next increment.

This plan explicitly excludes auth, edit/delete flows, and attachments.
It presents a single-page shell to users now while preserving internal route compatibility hooks for future expansion.

## Prerequisites
- `@arcgis/core` available in dependencies
- Valid `VITE_ARCGIS_WEBMAP_ID` and `VITE_ARCGIS_EDIT_LAYER_TITLE`
- Tooling: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`
- Existing baseline app shell/routing in:
  - `src/app/App.tsx`
  - `src/main.tsx`

## Sprint 1: App Shell + Context
**Goal**: Ship a runnable single-page shell with map runtime state owned by React context.

**Demo/Validation Checklist (Sprint Exit)**
- `pnpm dev` shows title ribbon, map region, top-left control anchor, right panel placeholder.
- Right panel is collapsed by default and can be toggled open.
- Shell can render full-width map and a `3fr 1fr` map/panel state without route changes.
- Map runtime state (`loading/ready/error`) is visible to UI consumers.

### Task 1.1: Build app shell regions and panel state
- **Location**:
  - `src/app/App.tsx`
  - `src/app/layout/AppShell.tsx` (new)
  - `src/index.css` (or split layout styles file if already used)
- **Description**:
  - Extract route/header-heavy scaffold into a map-first `AppShell`.
  - Add explicit regions: title ribbon, map canvas slot, top-left control anchor slot, collapsible workflow panel.
  - Keep routing compatibility hooks (future routes still possible), but foundation UI is single-page first and route nav is not exposed in the primary UX.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Desktop layout renders consistently.
  - Default state is map full width (panel closed).
  - Panel-open state applies `3fr 1fr` split.
  - No auth/form workflow logic leaks into shell state.
- **Validation**:
  - Manual UI smoke in `pnpm dev`.
  - Update/add component test in `src/app/App.test.tsx` for shell regions and default collapsed panel.
- **Commit Checkpoint**:
  - `feat(shell): add single-page map-first app shell with collapsible panel`

### Task 1.2: Introduce typed map runtime context and hook
- **Location**:
  - `src/map/context/MapContext.tsx` (new)
  - `src/map/hooks/useMapView.ts` (new)
  - `src/main.tsx`
- **Description**:
  - Add provider that exposes `webMap`, `mapView`, `status` (`idle|loading|ready|error`), and typed error details.
  - Wire provider at app root so shell/map features can consume without prop drilling.
  - Add `useMapView` hook that throws when used outside provider.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Consumers can read runtime state from any descendant.
  - Error status is typed and available for UI messaging.
  - Provider contract is stable for Sprint 2 services.
- **Validation**:
  - Unit tests for provider state transitions and hook guard behavior.
- **Commit Checkpoint**:
  - `feat(map): add map runtime context provider and useMapView hook`

## Sprint 2: Config + Layer Resolution
**Goal**: Resolve the target editable layer safely at runtime using validated config and isolated services.

**Demo/Validation Checklist (Sprint Exit)**
- Missing/invalid env values fail loudly with actionable messages.
- WebMap loader returns either a ready object or typed error.
- Editable layer resolution enforces feature-layer type and create capability.

### Task 2.1: Add env parsing and strict validation
- **Location**:
  - `src/config/env.ts` (new)
  - `src/vite-env.d.ts` (or existing env typing surface)
- **Description**:
  - Parse and validate:
    - `VITE_ARCGIS_WEBMAP_ID`
    - `VITE_ARCGIS_EDIT_LAYER_TITLE`
  - Export typed config object for downstream consumers.
  - Fail loudly on missing/invalid values (no silent defaults) and surface an explicit inline configuration error state in the shell.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Invalid env throws deterministic, actionable errors.
  - Consumers cannot access untyped `import.meta.env` directly for these values.
- **Validation**:
  - Unit tests for valid config, missing values, and malformed values.
- **Commit Checkpoint**:
  - `feat(config): add strict ArcGIS env parsing and validation`

### Task 2.2: Implement isolated WebMap loader service
- **Location**:
  - `src/map/services/loadWebMap.ts` (new)
  - `src/map/types/runtime.ts` (new or existing shared type file)
- **Description**:
  - Create service to construct/load `WebMap` from validated config.
  - Return typed success/error result for caller orchestration.
  - Keep ArcGIS SDK interaction out of React components.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Service API is pure from UI perspective (inputs/outputs typed, no DOM assumptions).
  - Loader reports failures with enough detail for UI and diagnostics.
- **Validation**:
  - Service tests with mocked ArcGIS load success and failure.
- **Commit Checkpoint**:
  - `feat(map): add WebMap loader service with typed result states`

### Task 2.3: Resolve editable feature layer with capability checks
- **Location**:
  - `src/map/services/resolveEditableLayer.ts` (new)
  - `src/map/types/layers.ts` (new)
- **Description**:
  - Locate layer by configured title.
  - Verify resolved object is a feature layer.
  - Verify create capability required for add-record flow in this increment.
  - Return typed layer handle or typed failure reason.
- **Dependencies**: Tasks 2.1, 2.2
- **Acceptance Criteria**:
  - Fails on missing layer, title collision ambiguity, type mismatch, or capability mismatch.
  - Success path returns a typed, reusable layer contract for future increments.
- **Validation**:
  - Unit tests for success + failure matrix.
- **Commit Checkpoint**:
  - `feat(map): add editable layer resolver with capability enforcement`

## Sprint 3: Editable Schema Discovery
**Goal**: Derive editable-field contract from live layer metadata for Increment 020 form generation.

**Demo/Validation Checklist (Sprint Exit)**
- Discovery output separates required and optional editable fields.
- Non-editable/system fields are excluded.
- Contract is consumable by add-record form logic in next increment.

### Task 3.1: Build editable schema discovery service
- **Location**:
  - `src/features/editing/services/discoverEditableSchema.ts` (new)
  - `src/features/editing/types/layerSchema.ts` (new)
- **Description**:
  - Inspect feature-layer field metadata.
  - Emit normalized schema model with field name, label, requiredness, type hints, domain constraints (when present).
  - Exclude non-editable/system-managed fields.
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - Required fields align with ArcGIS metadata semantics.
  - Output shape is stable and documented in type definitions.
- **Validation**:
  - Unit tests covering representative field metadata variants.
- **Commit Checkpoint**:
  - `feat(editing): add editable schema discovery service for runtime fields`

## Cross-Sprint Validation Strategy
- **Per Task**:
  - Run focused unit tests for changed module(s).
  - Manual smoke check when UI shell/state changes.
- **Per Sprint Exit**:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm lint`
- **Final Increment Exit**:
  - End-to-end happy-path dev smoke in `pnpm dev`:
    - shell renders,
    - config reads,
    - web map loads,
    - editable layer resolves,
    - schema discovery returns expected shape.

## Potential Risks & Gotchas
- Layer title collisions in a WebMap can resolve wrong target layer if not handled explicitly.
- Portal permissions can contradict local capability assumptions; treat capability checks as runtime truth.
- ArcGIS loading failures can be transient; error model should preserve actionable diagnostics.
- CSS layout regressions can break future 75/25 behavior if shell slots are not explicit.

## Rollback Plan
- Revert in reverse dependency order:
  1. Sprint 3 (schema discovery),
  2. Sprint 2 (config + services),
  3. Sprint 1 (shell + context).
- Keep each task in isolated commits so rollback does not remove unrelated groundwork.

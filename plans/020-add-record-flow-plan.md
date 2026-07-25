# Plan: Add-Record Workflow Increment

**Generated**: 2026-07-24  
**Estimated Complexity**: Medium

## Status
- **Overall**: Not Started
- **Last Updated**: 2026-07-24
- **Owner**: TBD
- **Current Sprint**: none

## Progress Checklist
- [ ] Sprint 1 complete (Add-Flow Orchestration)
  - [ ] Task 1.1 Create add-flow state machine
  - [ ] Task 1.2 Build add-flow panel scaffolding
  - [ ] Task 1.3 Add responsive single-page layout state hook
- [ ] Sprint 2 complete (Geometry + Form Capture)
  - [ ] Task 2.1 Implement point placement interaction
  - [ ] Task 2.2 Build dynamic attribute form
- [ ] Sprint 3 complete (Persist via applyEdits)
  - [ ] Task 3.1 Implement create feature service
  - [ ] Task 3.2 Wire submit orchestration in panel flow
- [ ] Verification complete (single-page + 75/25 layout during Add Story)

## Overview
Implement the end-to-end add-record workflow for one point layer: enter add mode, place a point, fill dynamic required attributes, submit via `applyEdits`, and show outcome.
UX constraint: this workflow stays on one page; when the Add Story form is open, map width remains 75% and form panel width is 25%.

## Prerequisites
- Increment `010-foundation-map-runtime-plan.md` completed
- Increment `015-ui-theme-and-components-plan.md` completed
- Runtime schema discovery available
- Editable point layer resolvable with create capability

## Sprint 1: Add-Flow Orchestration
**Goal**: Introduce deterministic add-flow state behavior.
**Demo/Validation**:
- State transitions work for start, cancel, submit, success, and error paths
- Entering form state enables single-page `3fr 1fr` map/panel layout

### Task 1.1: Create add-flow state machine
- **Location**:
  - `src/features/editing/model/addRecordState.ts`
  - `src/features/editing/model/useAddRecordState.ts`
- **Description**: Define transitions `idle -> placingGeometry -> fillingAttributes -> submitting -> success|error|cancelled`.
- **Dependencies**: Increment 010 complete
- **Acceptance Criteria**:
  - Invalid transitions are blocked
  - Cancel always returns to idle
- **Validation**:
  - Unit tests for transition rules

### Task 1.2: Build add-flow panel scaffolding
- **Location**:
  - `src/features/editing/ui/AddRecordPanel.tsx`
  - `src/features/editing/ui/AddRecordActions.tsx`
- **Description**: Build UI containers and controls driven by add-flow state.
- **Dependencies**: Task 1.1, Increment 015 Sprint 2
- **Acceptance Criteria**:
  - Panel shows correct content per state
  - Controls disable during submitting
  - Form-open state triggers map/panel split to `3fr 1fr` on desktop
  - Panel uses shared dark glassmorphic/matte themed components
- **Validation**:
  - Component tests for rendered states

### Task 1.3: Add responsive single-page layout state hook
- **Location**:
  - `src/app/layout/AppShell.tsx`
  - `src/features/editing/model/useAddRecordState.ts`
- **Description**: Wire add-flow state to layout mode so “Add Story/Add Record form open” uses `grid-template-columns: 3fr 1fr` without navigating away from the map page.
- **Dependencies**: Task 1.1, Task 1.2
- **Acceptance Criteria**:
  - No route change/page transition when opening form
  - Map remains visible and interactive in 75% area while form is open
  - Sidebar remains hidable and defaults to collapsed outside add-flow states
- **Validation**:
  - Component test verifies class/style switch for form-open state

## Sprint 2: Geometry + Form Capture
**Goal**: Capture one pending point plus valid attributes.
**Demo/Validation**:
- User can click map to place or replace one pending point
- Form enforces required fields from discovered schema

### Task 2.1: Implement point placement interaction
- **Location**:
  - `src/features/editing/map/useGeometryPlacement.ts`
  - `src/features/editing/map/placementGraphics.ts`
- **Description**: Wire map click to temporary point placement with cleanup on cancel/unmount.
- **Dependencies**: Task 1.1, Task 1.3
- **Acceptance Criteria**:
  - Exactly one pending point exists at any time
  - Cleanup removes graphics and listeners
- **Validation**:
  - Hook tests with mocked MapView events
  - Manual interaction test in browser

### Task 2.2: Build dynamic attribute form
- **Location**:
  - `src/features/editing/forms/AddRecordForm.tsx`
  - `src/features/editing/forms/addRecordSchema.ts`
  - `src/features/editing/forms/mapLayerFieldAdapters.ts`
- **Description**: Use runtime schema model to build and validate the form with `react-hook-form` + `zod`.
- **Dependencies**: Task 1.2, Task 2.1, Increment 010 Task 3.1
- **Acceptance Criteria**:
  - Required fields enforced from discovered schema
  - Field-to-attribute mapping is deterministic and typed
- **Validation**:
  - Form validation tests for valid/invalid input

## Sprint 3: Persist via applyEdits
**Goal**: Submit feature payload and surface result.
**Demo/Validation**:
- Successful submit returns feature ID and visible success message
- Failed submit shows actionable error details

### Task 3.1: Implement create feature service
- **Location**:
  - `src/features/editing/services/createFeature.ts`
  - `src/features/editing/types/editPayload.ts`
- **Description**: Compose `addFeatures` payload and call `FeatureLayer.applyEdits`; handle IDs and service errors.
- **Dependencies**: Task 2.1, Task 2.2
- **Acceptance Criteria**:
  - Payload includes geometry + validated attributes only
  - Errors are propagated and displayed, not swallowed
- **Validation**:
  - Service unit tests for success and failure responses

### Task 3.2: Wire submit orchestration in panel flow
- **Location**:
  - `src/features/editing/ui/AddRecordPanel.tsx`
  - `src/features/editing/model/useAddRecordState.ts`
- **Description**: Connect form submit to service call and state transitions.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Submit transitions through `submitting -> success|error`
  - Retry and cancel paths recover cleanly
- **Validation**:
  - Integration-style component test with service mocks

## Testing Strategy
- Unit: state machine, payload builder, service errors
- Component: panel state rendering and form behavior
- Manual: add point + submit + refresh visibility check
- Layout: verify 3:1 map-to-form split while Add Story form is open

## Potential Risks & Gotchas
- Required field types may have domains/ranges not captured by generic form controls
- Rapid user clicks during submit can cause duplicate request races

## Rollback Plan
- Feature-flag or temporarily remove add-record entry button
- Keep map runtime intact while reverting editing-specific files

# Plan: Hardening and Demo Readiness Increment

**Generated**: 2026-07-24  
**Estimated Complexity**: Medium

## Overview
Harden the add-record experience for repeatable demos and reliable handoff: map mode restoration, consistent feedback, test harnesses, and operator documentation.

## Prerequisites
- Increment `020-add-record-flow-plan.md` completed
- Add-record happy path working

## Sprint 1: Map Mode Safety
**Goal**: Ensure add mode enters/exits cleanly without persistent side effects.
**Demo/Validation**:
- Repeated enter/cancel/submit cycles preserve expected map state
- Form-open mode consistently preserves `3fr 1fr` split on desktop

### Task 1.1: Implement map mode controller
- **Location**:
  - `src/map/services/mapModeController.ts`
  - `src/features/editing/map/useAddModeMapEffects.ts`
- **Description**: Snapshot/restore map state when entering and leaving add mode.
- **Dependencies**: Increment 020 complete
- **Acceptance Criteria**:
  - Enter/exit is idempotent across repeated cycles
  - Restores original layer visibility/basemap/state after cancel or submit
- **Validation**:
  - Unit tests for snapshot and restore behavior

## Sprint 2: Error/Status UX Consistency
**Goal**: Eliminate silent failures and normalize user feedback.
**Demo/Validation**:
- Every failure path presents actionable UI feedback
- Success and loading states are consistent

### Task 2.1: Create reusable feedback components
- **Location**:
  - `src/components/feedback/InlineError.tsx`
  - `src/components/feedback/StatusBanner.tsx`
- **Description**: Provide consistent rendering primitives for loading, success, and error states.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Components are reusable across map load and edit submission flows
  - Messaging patterns are consistent and testable
- **Validation**:
  - Component tests per variant

### Task 2.2: Integrate feedback into map + edit flow
- **Location**:
  - `src/app/App.tsx`
  - `src/features/editing/ui/AddRecordPanel.tsx`
- **Description**: Replace ad-hoc status rendering with shared feedback components.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - No silent error branch remains
  - Retry guidance is present where applicable
- **Validation**:
  - Integration tests for error surfaces

## Sprint 3: Test and Ops Readiness
**Goal**: Ensure the increment is demo-ready and maintainable.
**Demo/Validation**:
- Full local test suite passes
- Fresh contributor can run demo from docs

### Task 3.1: Add add-flow integration test harness
- **Location**:
  - `src/features/editing/__tests__/add-record-flow.test.tsx`
  - `src/test/mocks/arcgis.ts`
- **Description**: Build deterministic mocked ArcGIS interactions for end-to-end add-flow orchestration tests.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Covers success, failure, and cancel flows
  - Stable in CI/local execution
  - Verifies layout switches to 75% map / 25% form when form is open
- **Validation**:
  - `pnpm test`

### Task 3.2: Publish operator runbook and env template
- **Location**:
  - `README.md`
  - `.env.example`
- **Description**: Document setup, required env keys, and a short conference demo sequence.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - New developer can run app and complete add-record demo with docs only
  - Docs include single-page layout behavior (full-map idle, 75/25 split when Add Story opens)
  - Docs include theme/component guidance for dark glassmorphic matte UI classes
- **Validation**:
  - Fresh setup walkthrough

## Testing Strategy
- Gate completion on:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
- Manual regression for repeated add-mode cycles

## Potential Risks & Gotchas
- Map state snapshots can become stale if multiple controllers mutate view state
- Mock fidelity may diverge from ArcGIS runtime behavior

## Rollback Plan
- Revert hardening increment independently while keeping add-flow core intact
- Disable advanced feedback/map effects if they regress demo stability

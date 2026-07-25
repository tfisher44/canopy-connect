# Implementation Plan: Style-Compliant Components List

**Branch**: `[001-style-guideline-components]` | **Date**: 2026-07-24 | **Spec**: `specs/001-style-guideline-components/spec.md`

**Input**: Feature specification from `/specs/001-style-guideline-components/spec.md`

## Summary

Add a dedicated, read-only catalog view that lists only style-compliant components, supports quick scanning with predictable ordering, and lets users open per-component compliance details (including passed checks and review recency). The plan follows existing app-shell architecture and roadmap sequencing style (incremental sprints, explicit dependencies, and validation checkpoints).

## Technical Context

**Language/Version**: TypeScript (~6.0), React 19

**Primary Dependencies**: React Router, Zod, React Hook Form (existing), Vitest + Testing Library, project CSS conventions in `src/index.css`

**Storage**: Frontend-managed data source (initially in-app provider/adapter pattern; no backend persistence introduced in this feature)

**Testing**: Vitest (`pnpm test`), type-check (`pnpm typecheck`), lint (`pnpm lint`)

**Target Platform**: Desktop-focused SPA in modern browsers via Vite

**Project Type**: Frontend web application (single-project)

**Performance Goals**: List and detail view interactions should remain instant for expected catalog sizes (<200 components); initial render should not regress shell usability

**Constraints**: Must preserve existing `AppShell` runtime layout behavior and naming conventions; read-only scope only; clear empty/error/retry states required

**Scale/Scope**: One new feature slice under `src/features` with supporting UI/model/service/testing updates and docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`/.specify/memory/constitution.md` currently contains placeholder tokens and no enforceable project principles.  
Gate result (pre-design): **PASS (no actionable constraints defined)**.  
Gate result (post-design): **PASS (no conflicts with placeholder constitution)**.

## Project Structure

### Documentation (this feature)

```text
specs/001-style-guideline-components/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── style-compliant-components-contract.md
└── tasks.md                    # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   └── layout/
│       └── AppShell.tsx
├── features/
│   ├── map/
│   ├── intake/
│   └── style-guidelines/       # New feature slice planned
│       ├── components/
│       ├── model/
│       ├── services/
│       └── __tests__/
├── pages/
├── test/
└── index.css
```

**Structure Decision**: Keep a single-project frontend structure and add a dedicated `src/features/style-guidelines` slice. This matches current naming (`features/*`, `app/layout/*`) and avoids cross-cutting rewrites.

## Delivery Plan (Phased/Sprint-Oriented)

### Sprint 1: Compliance Catalog Foundation
**Goal**: Establish compliant-component domain model and deterministic list query behavior.

#### Task 1.1: Define compliance catalog domain model
- **Scope**: Introduce typed entities for component records, compliance checks, review recency, and list ordering metadata.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Model supports FR-003/FR-004/FR-005/FR-008 attributes.
  - Overdue semantics are explicit (review-cadence driven).
  - Non-compliant records can be filtered out by model predicates.
- **Validation**:
  - `pnpm typecheck`
  - Unit test(s) for overdue and compliance-state helpers.

#### Task 1.2: Implement compliant-only query adapter contract
- **Scope**: Define and wire service interface that returns only compliant records in predictable default order, with typed error states.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Enforces FR-002 and FR-009 at adapter boundary.
  - Deterministic sort order documented and testable (FR-008).
  - Retry-capable error contract available for UI consumption (FR-007).
- **Validation**:
  - `pnpm test -- --runInBand` (or `pnpm test`)
  - Contract-level unit test for ordering/filtering behavior.

### Sprint 2: List and Detail Experience
**Goal**: Deliver user-facing list and detail views with empty/error handling.

#### Task 2.1: Build style-compliant list view in AppShell flow
- **Scope**: Add dedicated list region/page entry and render compliant component rows with required metadata.
- **Dependencies**: Sprint 1 complete
- **Acceptance Criteria**:
  - Dedicated accessible list view exists (FR-001).
  - Each row displays name, intended use, compliance status, and last review date (FR-003).
  - Empty-state message shown when no compliant data exists (FR-006).
- **Validation**:
  - Component tests for populated + empty rendering.
  - Manual smoke in `pnpm dev`.

#### Task 2.2: Build component compliance detail presentation
- **Scope**: Add details interaction from list item to display passed guideline checks and review recency.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - User can open details from list item (FR-004).
  - Detail view includes passed checks and review recency context.
  - Overdue reviews are visually distinct and understandable (FR-005).
- **Validation**:
  - UI tests for detail open/close and overdue indication.

### Sprint 3: Reliability, Validation, and Handoff
**Goal**: Close quality gates and document acceptance workflow.

#### Task 3.1: Error/retry UX and edge-case hardening
- **Scope**: Ensure graceful handling for load failures and stale review edge cases.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - Informative error state with retry action (FR-007).
  - Previously compliant but stale records are clearly identified (Edge Case).
  - No blank/ambiguous states for empty or failed data.
- **Validation**:
  - Component tests for error -> retry transitions.
  - Manual failure simulation in dev mode.

#### Task 3.2: End-to-end feature acceptance sweep
- **Scope**: Verify requirement coverage, update docs, and confirm release readiness.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Functional requirements FR-001..FR-009 mapped to automated/manual checks.
  - Quickstart steps execute cleanly.
  - No regressions in app shell routing or existing intake/map placeholders.
- **Validation**:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Dependency Sequence

1. Sprint 1 (model + adapter contract)
2. Sprint 2 (list + detail UI)
3. Sprint 3 (error hardening + release validation)

No Sprint 2 work should start before Sprint 1 contracts are locked; Sprint 3 gates release.

## Complexity Tracking

No constitution violations identified; table not required.

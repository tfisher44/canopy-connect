# Tasks: Style-Compliant Components List

**Input**: Design documents from `/specs/001-style-guideline-components/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/style-compliant-components-contract.md, quickstart.md

**Tests**: Included (explicitly requested). Tasks cover automated and manual validation for FR-001..FR-009.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`)
- Every task includes exact file path(s)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature slice and shared validation assets used by all stories.

- [ ] T001 Create feature slice folders and barrel exports in `src/features/style-guidelines/components/`, `src/features/style-guidelines/model/`, `src/features/style-guidelines/services/`, and `src/features/style-guidelines/__tests__/`
- [ ] T002 [P] Create compliant/non-compliant fixture dataset in `src/features/style-guidelines/model/fixtures/componentRecords.ts` aligned to `specs/001-style-guideline-components/data-model.md`
- [ ] T003 [P] Create feature test render helper in `src/features/style-guidelines/__tests__/testUtils.tsx` for provider/state-driven list and detail tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define typed domain contracts and service behavior that all user stories depend on.

**⚠️ CRITICAL**: No user story implementation starts before this phase is complete.

- [ ] T004 Define core domain types and load-state unions in `src/features/style-guidelines/model/types.ts` (ComponentRecord, StyleGuidelineCheckResult, ComplianceListViewModel)
- [ ] T005 [P] Implement review-recency and overdue derivation helpers in `src/features/style-guidelines/model/compliance.ts`
- [ ] T006 [P] Implement model validation schemas in `src/features/style-guidelines/model/schemas.ts` (required fields, compliant invariants, cadence rules)
- [ ] T007 Define provider interface and result contract in `src/features/style-guidelines/services/styleComplianceCatalogProvider.ts` per `contracts/style-compliant-components-contract.md`
- [ ] T008 Implement compliant-only filtering and deterministic ordering query in `src/features/style-guidelines/services/loadCompliantComponents.ts` (FR-002, FR-008, FR-009)
- [ ] T009 Add contract/unit tests for filtering, ordering, and overdue derivation in `src/features/style-guidelines/__tests__/loadCompliantComponents.contract.test.ts`

**Checkpoint**: Foundation complete; user stories can proceed.

---

## Phase 3: User Story 1 - Find Approved Components Quickly (Priority: P1) 🎯 MVP

**Goal**: Provide a dedicated, accessible compliant-components list with predictable scan behavior and robust empty/error/retry states.

**Independent Test**: Open the dedicated list view and verify compliant-only rows, required metadata, ordering, empty state, and retryable error behavior.

### Tests for User Story 1

- [ ] T010 [P] [US1] Create route-level render test for dedicated compliant list view in `src/features/style-guidelines/__tests__/styleCompliantComponents.route.test.tsx` (FR-001)
- [ ] T011 [P] [US1] Create list content test for row metadata and compliant-only visibility in `src/features/style-guidelines/__tests__/styleCompliantComponents.list.test.tsx` (FR-002, FR-003, FR-009)
- [ ] T012 [P] [US1] Create state tests for empty and error/retry transitions in `src/features/style-guidelines/__tests__/styleCompliantComponents.states.test.tsx` (FR-006, FR-007)

### Implementation for User Story 1

- [ ] T013 [US1] Add feature route wiring for style-compliant view in `src/app/App.tsx` and route fallback behavior in `src/app/layout/AppShell.tsx` (FR-001)
- [ ] T014 [P] [US1] Implement list container with loading/ready/empty/error state handling in `src/features/style-guidelines/components/StyleCompliantComponentsView.tsx` (FR-006, FR-007)
- [ ] T015 [P] [US1] Implement list and row presentation components in `src/features/style-guidelines/components/StyleCompliantComponentsList.tsx` and `src/features/style-guidelines/components/StyleCompliantComponentRow.tsx` (FR-003)
- [ ] T016 [US1] Integrate provider query + retry action into list container in `src/features/style-guidelines/components/StyleCompliantComponentsView.tsx` and `src/features/style-guidelines/services/inMemoryStyleComplianceCatalogProvider.ts` (FR-002, FR-007, FR-008, FR-009)
- [ ] T017 [US1] Add scoped list-view styles and overdue badge baseline tokens in `src/index.css` (or `src/features/style-guidelines/components/style-compliant-components.css`) for consistent scanning UX

**Checkpoint**: US1 is independently functional and validates FR-001, FR-002, FR-003, FR-006, FR-007, FR-008, FR-009.

---

## Phase 4: User Story 2 - Verify Approval Before Use (Priority: P2)

**Goal**: Let users open a listed component and inspect passed guideline checks and review recency evidence.

**Independent Test**: From the compliant list, open a component detail view and verify passed checks and overdue recency indicators are accurate and understandable.

### Tests for User Story 2

- [ ] T018 [P] [US2] Create interaction test for opening/closing details from list items in `src/features/style-guidelines/__tests__/styleCompliantComponentDetails.interaction.test.tsx` (FR-004)
- [ ] T019 [P] [US2] Create detail content test for passed checks and recency context in `src/features/style-guidelines/__tests__/styleCompliantComponentDetails.content.test.tsx` (FR-004, FR-005)

### Implementation for User Story 2

- [ ] T020 [US2] Implement detail panel/modal component in `src/features/style-guidelines/components/StyleCompliantComponentDetails.tsx` with guideline check rendering (FR-004)
- [ ] T021 [US2] Add detail open/close state orchestration in `src/features/style-guidelines/components/StyleCompliantComponentsView.tsx` (FR-004)
- [ ] T022 [US2] Implement overdue visual treatment and recency copy in `src/features/style-guidelines/components/StyleCompliantComponentRow.tsx`, `src/features/style-guidelines/components/StyleCompliantComponentDetails.tsx`, and `src/index.css` (FR-005)

**Checkpoint**: US2 is independently functional and validates FR-004 and FR-005.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Complete FR traceability, quality gates, and release-readiness validation.

- [ ] T023 Create FR traceability matrix mapping FR-001..FR-009 to automated/manual checks in `specs/001-style-guideline-components/quickstart.md`
- [ ] T024 [P] Add integration test for full happy-path list-to-detail workflow in `src/features/style-guidelines/__tests__/styleCompliantComponents.integration.test.tsx`
- [ ] T025 [P] Add regression test to ensure non-compliant/unreviewed fixtures never render in list in `src/features/style-guidelines/__tests__/styleCompliantComponents.regression.test.tsx`
- [ ] T026 Run quality gate commands and capture pass/fail notes in `specs/001-style-guideline-components/quickstart.md`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- [ ] T027 Perform manual validation scenarios (compliant list, empty, error/retry, overdue, detail checks) and log outcomes in `specs/001-style-guideline-components/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: starts immediately
- **Phase 2 (Foundational)**: depends on Phase 1; blocks all user stories
- **Phase 3 (US1)**: depends on Phase 2 completion
- **Phase 4 (US2)**: depends on Phase 3 (uses US1 list interactions)
- **Phase 5 (Polish)**: depends on Phases 3 and 4 completion

### User Story Dependencies

- **US1 (P1)**: first deliverable and MVP; no dependency on US2
- **US2 (P2)**: depends on US1 list UI being available for detail entry points

### Within-Story Ordering Rules

- Tests first (T010-T012 before T013-T017; T018-T019 before T020-T022)
- Model/service contracts before UI integration
- Retry/error and empty-state handling must be complete before story sign-off

---

## Parallel Opportunities

- **Setup**: T002 and T003 can run in parallel after T001
- **Foundational**: T005 and T006 can run in parallel after T004; T009 can run after T005/T008
- **US1**: T010, T011, T012 can run in parallel; T014 and T015 can run in parallel after T013
- **US2**: T018 and T019 can run in parallel; T020 and T022 can run in parallel after T019 baseline assertions are in place
- **Polish**: T024 and T025 can run in parallel before final command/manual validation

---

## Parallel Example: User Story 1

```bash
# Parallel test authoring
Task: "T010 [US1] route-level render test in src/features/style-guidelines/__tests__/styleCompliantComponents.route.test.tsx"
Task: "T011 [US1] list metadata/compliant-only test in src/features/style-guidelines/__tests__/styleCompliantComponents.list.test.tsx"
Task: "T012 [US1] empty + error/retry state test in src/features/style-guidelines/__tests__/styleCompliantComponents.states.test.tsx"

# Parallel implementation slices
Task: "T014 [US1] list state container in src/features/style-guidelines/components/StyleCompliantComponentsView.tsx"
Task: "T015 [US1] list/row presentation in src/features/style-guidelines/components/StyleCompliantComponentsList.tsx and StyleCompliantComponentRow.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Parallel test authoring
Task: "T018 [US2] details interaction test in src/features/style-guidelines/__tests__/styleCompliantComponentDetails.interaction.test.tsx"
Task: "T019 [US2] details content/recency test in src/features/style-guidelines/__tests__/styleCompliantComponentDetails.content.test.tsx"

# Parallel implementation slices
Task: "T020 [US2] detail panel component in src/features/style-guidelines/components/StyleCompliantComponentDetails.tsx"
Task: "T022 [US2] overdue visual treatment in row/detail components and src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational contracts + ordering/filtering)
3. Complete Phase 3 (US1 list view + states)
4. Validate FR-001, FR-002, FR-003, FR-006, FR-007, FR-008, FR-009
5. Demo/deploy MVP increment

### Incremental Delivery

1. Add US1 as production-ready compliant list experience
2. Add US2 detail evidence and overdue recency cues
3. Complete polish traceability + quality gates for full FR-001..FR-009 closure

### Team Parallelization

1. One developer owns model/service contracts (T004-T009)
2. One developer owns US1 UI + tests (T010-T017)
3. One developer owns US2 detail + tests after US1 checkpoint (T018-T022)
4. Shared ownership for final quality gates (T023-T027)

---

## Notes

- Tasks are intentionally committable and dependency-ordered
- `[P]` is only used where file-level parallel work is feasible
- User-story labels are applied to all story-phase tasks for traceability
- FR coverage is explicit across tests, implementation, and final validation tasks

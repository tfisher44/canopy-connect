# Phase 0 Research: Style-Compliant Components List

## Decision 1: Keep feature as a frontend-only read model with adapter boundary
- **Decision**: Implement the compliant-components source behind a feature-local adapter/service contract in `src/features/style-guidelines/services`, without introducing backend persistence in this increment.
- **Rationale**: Current architecture is a Vite/React SPA with no existing API tier in this repo. A local adapter keeps scope aligned with spec assumptions (read-only v1) while preserving a clean seam for future remote data.
- **Alternatives considered**:
  - Directly embed hardcoded data inside UI components (rejected: poor testability and weak error/retry modeling).
  - Introduce a new backend endpoint now (rejected: out of scope and inconsistent with current repository structure).

## Decision 2: Define deterministic default ordering as part of domain contract
- **Decision**: Sort compliant components by stable, predictable keys (primary: component name ascending; secondary: most recent review date descending) and encode this in tests/contract docs.
- **Rationale**: Satisfies FR-008 and avoids UI-level ad hoc sorting drift.
- **Alternatives considered**:
  - Preserve source insertion order (rejected: unstable and environment-dependent).
  - Sort only by review date (rejected: less scannable for “find by known component name” workflows).

## Decision 3: Model overdue status as derived state from review cadence
- **Decision**: Represent overdue status as computed state (`isOverdue`) derived from `lastReviewDate` + configured cadence threshold.
- **Rationale**: Aligns with FR-005 and avoids duplicating mutable flags that can become inconsistent.
- **Alternatives considered**:
  - Store explicit overdue booleans in source data (rejected: can drift from date/cadence reality).
  - Omit overdue derivation and show only dates (rejected: does not satisfy required visual indication).

## Decision 4: Treat empty/error/retry as first-class UI states
- **Decision**: Define explicit load states (`loading`, `ready`, `empty`, `error`) with retry action contract at feature boundary.
- **Rationale**: Required by FR-006/FR-007 and consistent with roadmap style of deterministic state-driven UX.
- **Alternatives considered**:
  - Generic “failed to load” toast only (rejected: insufficiently actionable and not persistent for users).
  - Silent fallback to blank list (rejected: violates FR-006 and usability expectations).

## Decision 5: Preserve existing naming and layout conventions
- **Decision**: Place new code under `src/features/style-guidelines/*` and integrate via `AppShell`/route-level composition without introducing new app architecture patterns.
- **Rationale**: Matches current repo conventions (`features/*`, `app/layout/*`) and keeps incremental roadmap sequencing coherent.
- **Alternatives considered**:
  - Add top-level `modules/` or separate package (rejected: unnecessary complexity for current scope).
  - Put all feature logic directly in `AppShell` (rejected: poor separation and lower maintainability).

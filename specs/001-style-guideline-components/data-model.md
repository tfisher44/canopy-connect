# Data Model: Style-Compliant Components List

## Entity: ComponentRecord
Represents a reusable UI component known to the catalog.

### Fields
- `id: string` — Stable unique identifier.
- `name: string` — Display name used in list ordering and lookup.
- `intendedUse: string` — Summary of when to use the component.
- `category: string` — Optional grouping (navigation, form, map overlay, etc.).
- `complianceStatus: "compliant" | "non_compliant" | "unreviewed"` — Current compliance state.
- `lastReviewDate: string (ISO-8601)` — Timestamp/date for most recent compliance review.
- `reviewCadenceDays: number` — Cadence threshold used to determine overdue status.
- `checksPassed: StyleGuidelineCheckResult[]` — Passed checks shown in details.

### Validation Rules
- `name` and `intendedUse` are required, non-empty strings.
- `complianceStatus` must be one of the defined enum values.
- `lastReviewDate` must be valid date string when `complianceStatus = "compliant"`.
- `reviewCadenceDays` must be positive integer.
- `checksPassed.length > 0` when `complianceStatus = "compliant"`.

### Derived Fields
- `isOverdue: boolean` = `today - lastReviewDate > reviewCadenceDays`.

## Entity: StyleGuidelineCheckResult
Represents an individual guideline criterion the component passed.

### Fields
- `checkId: string`
- `checkName: string`
- `checkDescription: string`
- `passedAt: string (ISO-8601)`
- `reviewedBy: string`

### Validation Rules
- All fields required.
- `passedAt` cannot be later than current time.

## Entity: ComplianceListViewModel
List-oriented projection used by the compliant components page.

### Fields
- `items: ComponentListItem[]`
- `state: "loading" | "ready" | "empty" | "error"`
- `errorMessage?: string`
- `canRetry: boolean`
- `lastLoadedAt?: string (ISO-8601)`

## Entity: ComponentListItem
Minimal item needed for list rendering.

### Fields
- `id: string`
- `name: string`
- `intendedUse: string`
- `complianceStatus: "compliant"` (filtered invariant for this feature list)
- `lastReviewDate: string`
- `isOverdue: boolean`

## Relationships
- `ComponentRecord 1 -> N StyleGuidelineCheckResult`.
- `ComplianceListViewModel.items` is a filtered projection of `ComponentRecord` where `complianceStatus = "compliant"`.

## State Transitions

### List Loading State
`loading -> ready | empty | error`

- `ready` when compliant items > 0
- `empty` when compliant items = 0
- `error` when data retrieval fails

### Detail Interaction State
`closed -> open(componentId) -> closed`

- Detail panel/modal opens only for items currently present in compliant list.
- If selected item is removed/refetched as non-compliant, detail closes and list refreshes.

## Ordering Contract
- Default order:
  1. `name` ascending (case-insensitive)
  2. `lastReviewDate` descending as tie-breaker
- Ordering is applied at service/adapter boundary before UI rendering.

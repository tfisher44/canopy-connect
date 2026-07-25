# Contract: Style-Compliant Components Catalog

## Purpose
Define the feature-facing interface for loading and presenting components that satisfy style guidelines.

## Provider Contract

```ts
type ComplianceStatus = "compliant" | "non_compliant" | "unreviewed";

type StyleGuidelineCheckResult = {
  checkId: string;
  checkName: string;
  checkDescription: string;
  passedAt: string; // ISO-8601
  reviewedBy: string;
};

type ComponentRecord = {
  id: string;
  name: string;
  intendedUse: string;
  category?: string;
  complianceStatus: ComplianceStatus;
  lastReviewDate: string; // ISO-8601
  reviewCadenceDays: number;
  checksPassed: StyleGuidelineCheckResult[];
};

type LoadCompliantComponentsResult =
  | { state: "ready"; items: ComponentRecord[]; loadedAt: string }
  | { state: "empty"; items: []; loadedAt: string }
  | { state: "error"; message: string; retryable: true };

interface StyleComplianceCatalogProvider {
  loadCompliantComponents(): Promise<LoadCompliantComponentsResult>;
}
```

## Behavioral Guarantees
- Returns compliant records only (`complianceStatus === "compliant"`).
- Applies deterministic default ordering before returning:
  1. `name` ascending (case-insensitive)
  2. `lastReviewDate` descending (tie-breaker)
- Exposes retryable error states for UI retry action.

## List UI Contract

Each rendered list item MUST show:
- `name`
- `intendedUse`
- `complianceStatus` (compliant)
- `lastReviewDate`
- overdue indicator derived from `reviewCadenceDays`

## Detail UI Contract

For a selected compliant component, detail view MUST show:
- Component name
- Last review date and overdue recency status
- Passed guideline checks (`checkName`, optional description)
- Reviewer attribution and pass timestamp where available

## Edge-State Contract
- If zero compliant items: render explicit empty state with guidance text.
- If loading fails: render informative error and retry action.
- Non-compliant/unreviewed records MUST NOT be displayed in compliant list.

## Validation Mapping
- FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009

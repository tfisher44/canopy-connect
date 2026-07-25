# Quickstart: Validate Style-Compliant Components List

## Prerequisites
- Node + pnpm environment available
- Repository dependencies installed

## Setup

```bash
cd /Users/sup15027/Documents/canopy-connect
pnpm install
```

## Validation Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Manual Validation Scenarios

1. **Compliant list renders**
   - Start app: `pnpm dev`
   - Open the style-compliant components view.
   - Verify only compliant components are listed.
   - Confirm each row includes name, intended use, status, and last review date.

2. **Component details show passed checks**
   - Open details from a listed component.
   - Verify guideline checks passed and review recency are visible.

3. **Overdue review indication**
   - Use test fixture/data setup with stale `lastReviewDate`.
   - Verify overdue visual indicator appears and is understandable.

4. **Empty state**
   - Use fixture where compliant list is empty.
   - Verify explicit empty-state message appears (no blank page/list).

5. **Error and retry**
   - Simulate provider failure.
   - Verify informative error message and retry action.
   - Trigger retry and verify recovery path.

## Traceability References
- Spec: `specs/001-style-guideline-components/spec.md`
- Plan: `specs/001-style-guideline-components/plan.md`
- Data model: `specs/001-style-guideline-components/data-model.md`
- Contract: `specs/001-style-guideline-components/contracts/style-compliant-components-contract.md`

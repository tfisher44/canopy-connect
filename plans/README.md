# Implementation Plans

Generated on 2026-07-25. Execute in the order below unless dependencies require otherwise.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 000 | Editable Map MVP Roadmap (meta roadmap) | P2 | M | — | IN PROGRESS (010/015 partially landed; 020/030 still open) |
| 010 | Foundation Map Runtime Increment | P1 | M | — | IN PROGRESS (shell/runtime landed; env+layer services incomplete) |
| 015 | UI Theme and Component System Increment | P1 | M | 010 | IN PROGRESS (core themed shell components landed; wrapper inventory incomplete) |
| 020 | Add-Record Workflow Increment | P1 | M | 010, 015 | BLOCKED (editing/applyEdits scope not present in current codebase) |
| 030 | Hardening and Demo Readiness Increment | P1 | M | 020 | BLOCKED (depends on 020 add-record implementation) |
| 040 | Enforce imagery-only visibility during tree point selection | P1 | M | 020 | IN PROGRESS (behavior/tests pass; lint gate still has 1 warning) |
| 050 | Enforce explicit API base URL configuration for intake writes | P1 | S | 020 | TODO |
| 060 | Validate create-tree API response contract before state updates | P1 | S | 050 | TODO |
| 070 | Add API integration-style tests for intake tree/story submission flow | P1 | M | 050, 060 | TODO |
| 080 | Fix MapPlaceholder ref-cleanup lint warning | P2 | S | — | TODO |
| 090 | Remediate React Router high-severity advisory safely | P1 | M | — | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with reason) | REJECTED (with rationale)

## Dependency notes

- 015 depends on 010 for shell/runtime foundations.
- 020 depends on 010 + 015 for map runtime and UI primitives.
- 030 depends on 020 because hardening assumes add-record flow exists.
- 040 depends on 020 because it extends the existing tree/story map selection flow.
- If 030 and 040 are executed in parallel, coordinate map visibility behavior because both touch map mode concerns.
- 020 and 030 are currently blocked by roadmap drift (current implementation is intake/tree-story flow, not `features/editing` applyEdits flow).
- 050 should run before 060 and 070 so API configuration failures are explicit.
- 060 should run before 070 so tests validate final response-contract behavior.
- 080 is independent and can run in parallel with 050/060/070.
- 090 is independent but should be staged separately because it may involve framework-version migration risk.

## Plan files

- `000-editable-map-roadmap-plan.md`
- `010-foundation-map-runtime-plan.md`
- `015-ui-theme-and-components-plan.md`
- `020-add-record-flow-plan.md`
- `030-hardening-demo-readiness-plan.md`
- `040-map-point-selection-imagery-only-plan.md`
- `050-enforce-api-base-url-configuration.md`
- `060-validate-create-tree-response-contract.md`
- `070-add-intake-api-integration-tests.md`
- `080-fix-map-ref-cleanup-lint-warning.md`
- `090-remediate-react-router-security-advisory.md`

## Findings considered and rejected

- 020 original `features/editing` file targets appear stale versus current intake architecture; treat as blocked until rewritten to current code shape.

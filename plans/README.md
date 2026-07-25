# Implementation Plans

Generated on 2026-07-25. Execute in the order below unless dependencies require otherwise.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 000 | Editable Map MVP Roadmap (meta roadmap) | P2 | M | — | TODO |
| 010 | Foundation Map Runtime Increment | P1 | M | — | TODO |
| 015 | UI Theme and Component System Increment | P1 | M | 010 | TODO |
| 020 | Add-Record Workflow Increment | P1 | M | 010, 015 | TODO |
| 030 | Hardening and Demo Readiness Increment | P1 | M | 020 | TODO |
| 040 | Enforce imagery-only visibility during tree point selection | P1 | M | 020 | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with reason) | REJECTED (with rationale)

## Dependency notes

- 015 depends on 010 for shell/runtime foundations.
- 020 depends on 010 + 015 for map runtime and UI primitives.
- 030 depends on 020 because hardening assumes add-record flow exists.
- 040 depends on 020 because it extends the existing tree/story map selection flow.
- If 030 and 040 are executed in parallel, coordinate map visibility behavior because both touch map mode concerns.

## Plan files

- `000-editable-map-roadmap-plan.md`
- `010-foundation-map-runtime-plan.md`
- `015-ui-theme-and-components-plan.md`
- `020-add-record-flow-plan.md`
- `030-hardening-demo-readiness-plan.md`
- `040-map-point-selection-imagery-only-plan.md`

## Findings considered and rejected

- None recorded in this index yet.

# Plan: Editable Map MVP Roadmap

**Generated**: 2026-07-24  
**Estimated Complexity**: Medium

## Overview
This roadmap decomposes the editable map MVP into incremental, spec-driven plans that can be implemented in order.  
Primary MVP target: desktop **single-page** web app that can add a new record to one ArcGIS point feature layer (no auth yet, no edit/delete, no attachments in v1).
Layout requirements:
- Entire page is map-first with map visible at all times
- Top title ribbon contains app name
- Top-left search control supports zoom-to location for tree placement
- Right sidebar is hidable and used for Add Story form
- When Add Story form is open, map remains **75% width** and form sidebar is **25% width**
UI style requirements:
- Dark theme
- Glassmorphic + matte visual treatment
- Radix/shadcn component primitives with custom class-name styling

## Prerequisites
- ArcGIS Online WebMap item ID
- Editable point feature layer title with `Create` + `Query` capability
- Vite env wiring for map/layer identifiers
- Existing repo toolchain (`pnpm`, TypeScript, Vitest, ESLint)

## Implementation Sequence
1. `010-foundation-map-runtime-plan.md`
2. `015-ui-theme-and-components-plan.md`
3. `020-add-record-flow-plan.md`
4. `030-hardening-demo-readiness-plan.md`

## Sprint 1: Foundation Increment
**Goal**: Map renders reliably and editable layer metadata is discoverable.
**Demo/Validation**:
- `pnpm dev` loads the web map
- Missing config and missing layer surface clear UI/system errors
- Single-page shell includes title ribbon, top-left search anchor, and hidable right sidebar

## Sprint 1.5: UI Theme + Component Increment
**Goal**: Deliver reusable dark glassmorphic/matte component set with Radix/shadcn primitives.
**Demo/Validation**:
- Shared component set renders with consistent tokens
- App shell and add-story panel consume shared themed components

## Sprint 2: Add-Record Increment
**Goal**: Complete add-record flow for one point feature.
**Demo/Validation**:
- User enters add mode, places a point, submits required attributes, and sees persisted result
- While Add Story form is open, layout stays on a single page with a 3:1 map-to-form split

## Sprint 3: Hardening Increment
**Goal**: Reliable UX, deterministic tests, and handoff-quality docs.
**Demo/Validation**:
- Happy path + error path + cancel/reset path verified
- Operator can run conference demo from README checklist

## Testing Strategy
- Run unit/component tests after each increment
- Run full `pnpm test`, `pnpm typecheck`, `pnpm lint` before increment completion
- Validate manual smoke flow after every merge

## Potential Risks & Gotchas
- Feature layer schema may differ across environments
- Event listeners can leak during map interaction mode switches
- Layer supports query but not create in target environment

## Rollback Plan
- Revert increment-by-increment (010, then 020, then 030)
- Preserve successful lower increments while rolling back higher increments

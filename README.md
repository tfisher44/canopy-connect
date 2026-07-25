# Canopy Connect Starter

Minimal starter scaffold for:
- React + TypeScript (Vite)
- React Router
- React Hook Form + Zod validation
- Radix UI primitives
- ArcGIS SDK placeholder integration surface

## Routes
- `/` Main shell view (map hero with workflow panel collapsed by default)
- `/form` Alias route to the main shell
- `/map` Alias route to the main shell
- `/style-guidelines/components` Style-compliant components panel (panel open by default)
- `*` Fallback route to the main shell

## Appearance system
- Built-in themes: Aurora, Canopy Dusk, Sunset Neon, Midnight Bloom, Ember Mist, Verdant Glow
- Color modes: `dark` and `light`
- Defaults: `verdant-glow` + `light`
- Appearance state persists in `localStorage`:
  - `canopy-connect-theme`
  - `canopy-connect-color-mode`
- Controls live in the fixed top ribbon:
  - Theme dropdown
  - Dark/Light mode toggle

## UI shell structure
- Fixed ribbon header for branding and appearance controls
- Main map hero region as the primary canvas
- Right-side workflow panel that can be toggled open/closed

## Scripts
- `pnpm dev` start local dev server
- `pnpm build` production build
- `pnpm preview` preview built app
- `pnpm typecheck` TypeScript checks
- `pnpm lint` ESLint checks
- `pnpm test` run Vitest

## Getting started
```bash
pnpm install
pnpm dev
```

## Spec-driven decisions (Spec Kit)

This repo is initialized with **Spec Kit** so architectural and product decisions can be tracked as specs/plans/tasks instead of ad-hoc notes.

- Core project scaffolding lives in `.specify/`
- Copilot slash command prompts/agents live in `.github/prompts/` and `.github/agents/`

Typical flow in Copilot Chat:

1. `/speckit.constitution` to set decision-making principles
2. `/speckit.specify` to capture requirements and intent
3. `/speckit.plan` to document technical decisions
4. `/speckit.tasks` to generate execution tasks
5. `/speckit.implement` to execute against the approved plan

Optional quality gates:

- `/speckit.clarify`
- `/speckit.analyze`
- `/speckit.checklist`
- `/speckit.converge`

## ArcGIS references for next phase
- https://github.com/Esri/jsapi-resources/tree/main/templates/ai-components-custom-agent-hil-react
- https://github.com/Esri/jsapi-resources/blob/main/templates/ai-components-custom-agent-hil-react/src/maintenanceAgent.ts#L187-L218
- https://github.com/omarkawach/esri-conferences/tree/main/UC-2026/programming-patterns-and-best-practices

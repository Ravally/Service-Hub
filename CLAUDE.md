# Scaffld

Field service management platform for home service businesses.
**Stack:** React 18 + Vite | Firebase (Firestore, Auth, Storage, Functions) | Tailwind CSS | Stripe
**Domain:** scaffld.app | **Tagline:** "Build on Scaffld."

## Key Rules

- **Multi-tenant:** Every Firestore query is scoped under `users/{userId}`
- **Money:** Always integers (cents) in calculations, format with `formatCurrency()`
- **Components:** Under 200 lines, single responsibility, use existing hooks
- **Functions:** Max 40 lines per function
- **Imports:** Always from `src/utils/`, `src/constants/`, `src/hooks/data/` — never duplicate locally
- **State:** Contexts for global state, local state for component-specific needs
- **Data fetching:** Custom hooks only (`useClients`, `useJobs`, etc.) — never raw Firestore in components
- **Brand:** Use Scaffld design tokens (scaffld-teal, signal-coral, harvest-amber, midnight, charcoal) — no hardcoded hex, no `bg-gray-*`
- **Touch targets:** Min 44px (field workers use this in gloves/sunlight)
- **Errors:** Always try/catch async operations with user feedback

## Documentation Index

- **Roadmap & features:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Architecture & folder structure:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Coding conventions:** [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
- **Brand & design system:** [brand/SCAFFLD_BRAND.md](brand/SCAFFLD_BRAND.md)
- **Design mockups (HTML, read-only):** [design/mockups/](design/mockups/)
- **Dev environment setup:** [docs/guides/SETUP.md](docs/guides/SETUP.md)
- **Deployment guide:** [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)
- **Current phase details:** [docs/phases/PHASE_2_IN_PROGRESS.md](docs/phases/PHASE_2_IN_PROGRESS.md)

## Skills Available

- **scaffld-component** — UI/React component generation with brand tokens
- **scaffld-api** — API endpoints & Server Actions
- **scaffld-db-migration** — Prisma schema & migrations
- **scaffld-code-review** — Code quality audits (security, types, a11y, perf)
- **scaffld-design-reference** — HTML mockups & brand reference

## Current Status

- Phase 1: Client Hub & Security — Complete
- Phase 2.3: Forms & Checklists — Complete
- Phase 2.1-2.2: Mobile App + GPS — In Progress

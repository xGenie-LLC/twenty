# Repository Guidelines

## Project Structure
- Nx monorepo under `packages/`. Core apps: `twenty-server` (NestJS/TypeORM API + worker) and `twenty-front` (React + Vite). Shared libs: `twenty-ui` (design system), `twenty-shared` (types/domain), `twenty-utils`, `twenty-emails`, `twenty-e2e-testing`, `twenty-docs`, etc.
- Root hosts workspace config (`nx.json`, `tsconfig.base.json`, `eslint.config.*`, `jest.*`, `Makefile`). Each project has a `project.json` describing targets.
- Prefer workspace imports (`twenty-ui/...`, `twenty-shared/...`) over deep relatives; respect scope tags (`scope:frontend`, `scope:backend`, `scope:shared`).

## Setup & Local Development
- Runtime: Node 24 (see `.nvmrc`), Yarn 4 (`corepack enable`). Install deps with `yarn install`.
- Bring up infra: `make postgres-on-docker` and `make redis-on-docker`, or point to existing services via env vars.
- Start full stack: `yarn start` (API on `http://localhost:3000`, front on `http://localhost:3001`, worker included).
- Start individually: `yarn nx run twenty-server:start`, `yarn nx run twenty-server:worker`, `yarn nx run twenty-front:start`.
- Build artifacts: `yarn nx run-many -t build -p twenty-server twenty-front` (or `yarn nx build <project>`).

## Database & Migrations
- Apply schema changes: `yarn nx run twenty-server:database:migrate`.
- Reset + seed for local dev: `yarn nx run twenty-server:database:reset --configuration seed`.
- Deployments (e.g., Dokploy): run the migrate command as a pre-start hook so new releases keep DB schema in sync automatically.

## Coding Style & Naming
- TypeScript-first; two-space indent; avoid `any` unless legacy. Components/hooks in PascalCase; hooks prefixed with `use`.
- Lint/format: `yarn nx lint <project>` and `yarn nx fmt <project> --configuration fix`. Prettier defaults (LF, single quotes, trailing commas) apply.
- Reuse `twenty-shared` types and `twenty-ui` primitives instead of duplicating UI or domain models.

## Testing Guidelines
- Unit tests: `yarn nx test <project>` (Jest). Backend integration: `yarn nx run twenty-server:test:integration --configuration with-db-reset` (requires Postgres/Redis).
- Frontend GraphQL types: `yarn nx run twenty-front:graphql:generate`.
- E2E (Playwright): `yarn nx test twenty-e2e-testing` after the stack is up.

## Commit & PR Expectations
- Commits: concise, imperative; prefixes like `feat:`, `fix:`, `chore:` welcome. Keep logical changes grouped.
- PRs: describe intent, link issues/tickets, call out migrations or API/GraphQL changes, add screenshots/GIFs for UI updates, and list checks run (lint/tests/migrations); note any skipped steps with rationale.

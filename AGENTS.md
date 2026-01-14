# Repository Guidelines

## Project Structure & Module Organization
Twenty is an Nx monorepo. Source lives under `packages/` with apps and libs. Key modules include `packages/twenty-front/` (React app), `packages/twenty-server/` (NestJS backend), `packages/twenty-ui/` (shared UI), `packages/twenty-shared/` (types/utils), plus `packages/twenty-emails/`, `packages/twenty-docs/`, `packages/twenty-website/`, and `packages/twenty-e2e-testing/` (Playwright). Tooling lives in `tools/`, with workspace config in `nx.json` and `tsconfig.base.json`.

## Build, Test, and Development Commands
- `yarn start` runs frontend + backend + worker together.
- `npx nx start twenty-front` runs only the frontend dev server.
- `npx nx start twenty-server` runs only the backend dev server.
- `npx nx run twenty-server:worker` starts the background worker.
- `npx nx build <project>` builds a package (example: `npx nx build twenty-front`).
- `npx nx lint <project> --configuration=fix` runs ESLint with autofix.
- `npx nx typecheck <project>` runs TypeScript type checks.
- `npx nx run twenty-front:graphql:generate` refreshes frontend GraphQL types (data schema).
- `npx nx run twenty-front:graphql:generate --configuration=metadata` refreshes metadata schema types.
- Storybook (frontend): `npx nx run twenty-front:storybook:serve:dev` or `npx nx run twenty-front:storybook:test`.

## Coding Style & Naming Conventions
- Prettier config (`.prettierrc`): single quotes, trailing commas, LF line endings.
- ESLint is the primary lint gate; use per-project `lint` targets.
- React code uses functional components only and named exports only.
- Prefer `type` over `interface` (except when extending third-party types).
- Avoid `any`; prefer string literal unions instead of enums where possible.
- Naming: `camelCase` variables/functions, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants, `kebab-case` files/dirs, props types end with `Props`.

## Testing Guidelines
- Jest is the default test runner; React tests use `*.test.ts(x)` and backend tests typically use `*.spec.ts`.
- Unit tests: `npx nx test twenty-front` or `npx nx test twenty-server`.
- Integration tests: `npx nx run twenty-server:test:integration --configuration=with-db-reset`.
- E2E (Playwright): `npx nx run twenty-e2e-testing:test`.

## Commit & Pull Request Guidelines
- Commit messages generally follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor(scope):` with short, imperative subjects; keep close to recent history.
- PRs should include a clear description, testing notes/commands run, and screenshots or recordings for UI changes.
- Call out schema, migration, or configuration changes explicitly.

## Configuration & Local Services
- Copy environment templates when starting a package (`packages/*/.env.example` -> `.env`).
- Local deps can be run via Makefile (example: `make postgres-on-docker`, `make redis-on-docker`, `make clickhouse-on-docker`).
- For AI/automation notes or fork-specific merge instructions, see `CLAUDE.md`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twenty is an open-source CRM built with modern technologies in a monorepo structure. The codebase is organized as an Nx workspace with multiple packages.

## Key Commands

### Development
```bash
# Start development environment (frontend + backend + worker)
yarn start

# Individual package development
npx nx start twenty-front     # Start frontend dev server
npx nx start twenty-server    # Start backend server
npx nx run twenty-server:worker  # Start background worker
```

### Testing
```bash
# Run all tests for a project
npx nx test twenty-front      # Frontend unit tests
npx nx test twenty-server     # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests with DB reset

# Run a single test file (PREFERRED - Fast & Efficient)
npx jest path/to/test.test.ts --config=packages/PROJECT/jest.config.mjs

# Examples:
npx jest packages/twenty-front/src/modules/localization/utils/detection/detectNumberFormat.test.ts --config=packages/twenty-front/jest.config.mjs
npx jest packages/twenty-server/src/utils/__test__/is-work-email.spec.ts --config=packages/twenty-server/jest.config.mjs

# Run with watch mode for development
npx jest path/to/test.test.ts --config=packages/twenty-front/jest.config.mjs --watch

# Storybook
npx nx storybook:build twenty-front         # Build Storybook
npx nx storybook:serve-and-test:static twenty-front     # Run Storybook tests


When testing the UI end to end, click on "Continue with Email" and use the prefilled credentials.
```

### Code Quality
```bash
# Linting
npx nx lint twenty-front      # Frontend linting
npx nx lint twenty-server     # Backend linting
npx nx lint twenty-front --fix  # Auto-fix linting issues

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format code
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build
```bash
# Build packages
npx nx build twenty-front
npx nx build twenty-server
```

### Database Operations
```bash
# Database management
npx nx database:reset twenty-server         # Reset database
npx nx run twenty-server:database:init:prod # Initialize database
npx nx run twenty-server:database:migrate:prod # Run migrations

# Generate migration
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/common/[name] -d src/database/typeorm/core/core.datasource.ts

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata
```

### GraphQL
```bash
# Generate GraphQL types
npx nx run twenty-front:graphql:generate
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Recoil (state management), Emotion (styling), Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (with GraphQL Yoga)
- **Monorepo**: Nx workspace managed with Yarn 4

### Package Structure
```
packages/
├── twenty-front/          # React frontend application
├── twenty-server/         # NestJS backend API
├── twenty-ui/             # Shared UI components library
├── twenty-shared/         # Common types and utilities
├── twenty-emails/         # Email templates with React Email
├── twenty-website/        # Next.js documentation website
├── twenty-zapier/         # Zapier integration
└── twenty-e2e-testing/    # Playwright E2E tests
```

### Key Development Principles
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Types over interfaces** (except when extending third-party interfaces)
- **String literals over enums** (except for GraphQL enums)
- **No 'any' type allowed**
- **Event handlers preferred over useEffect** for state updates

### State Management
- **Recoil** for global state management
- Component-specific state with React hooks
- GraphQL cache managed by Apollo Client

### Backend Architecture
- **NestJS modules** for feature organization
- **TypeORM** for database ORM with PostgreSQL
- **GraphQL** API with code-first approach
- **Redis** for caching and session management
- **BullMQ** for background job processing

### Database
- **PostgreSQL** as primary database
- **Redis** for caching and sessions
- **TypeORM migrations** for schema management
- **ClickHouse** for analytics (when enabled)

## Development Workflow

### Before Making Changes
1. Always run linting and type checking after code changes
2. Test changes with relevant test suites
3. Ensure database migrations are properly structured
4. Check that GraphQL schema changes are backward compatible

### Code Style Notes
- Use **Emotion** for styling with styled-components pattern
- Follow **Nx** workspace conventions for imports
- Use **Lingui** for internationalization (`@lingui/react` with `t` macro)
- Components should be in their own directories with tests and stories
- **Naming Conventions**:
  - Variables and functions: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Types and Classes: `PascalCase`
  - Component props suffix with `Props` (e.g., `ButtonProps`)
  - Files and directories: `kebab-case`
- **Never use abbreviations** in variable names (e.g., use `user` not `u`, `fieldMetadataItem` not `f`)
- **Import order**: External libraries → Internal modules (absolute paths) → Relative imports
- **Comments**: Use short-form `//` comments for business logic, not JSDoc blocks. Explain WHY, not WHAT
- **No 'any' type allowed** - use proper TypeScript types
- Use utility helpers: `isDefined()`, `isNonEmptyString()`, `isNonEmptyArray()` from `@sniptt/guards`

### Testing Strategy
- **Unit tests** with Jest for both frontend and backend
- **Integration tests** for critical backend workflows
- **Storybook** for component development and testing
- **E2E tests** with Playwright for critical user flows
- Follow **AAA pattern** (Arrange, Act, Assert) in tests
- Test user behavior, not implementation details

### React Component Guidelines
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Event handlers preferred over useEffect** for state updates
- Destructure props in component parameters
- Small, focused components following single responsibility principle
- Use composition over inheritance

### TypeScript Conventions
- **Types over interfaces** (except when extending third-party interfaces)
- **String literals over enums** (except for GraphQL enums)
- Use `type` for all type definitions
- Leverage type inference when types are clear
- Use discriminated unions with type guards
- Component props should be suffixed with `Props`

## Important Files
- `nx.json` - Nx workspace configuration with task definitions
- `tsconfig.base.json` - Base TypeScript configuration
- `package.json` - Root package with workspace definitions
- `.cursor/rules/` - Development guidelines and best practices

## Troubleshooting

### GraphQL Types Out of Sync (Frontend/Backend Mismatch)

**Symptoms:**
- Features in Settings (like object-level permissions) don't work properly
- API returns data but UI shows empty or missing fields
- Fields exist in database but not in API response

**Cause:**
Twenty uses GraphQL Code Generator to create TypeScript types from the backend schema. These generated files are committed to the repository. If someone modifies the backend GraphQL schema but forgets to regenerate frontend types, they will be out of sync.

**Solution:**
```bash
# Regenerate metadata types (requires running backend OR production URL)
# Option 1: Point to production server
export REACT_APP_SERVER_BASE_URL=https://your-twenty-instance.com
npx graphql-codegen --config=packages/twenty-front/codegen-metadata.cjs

# Option 2: Point to local backend (must be running on localhost:3000)
npx nx run twenty-front:graphql:generate

# After regenerating, commit the changes
git add packages/twenty-front/src/generated-metadata/graphql.ts
git commit -m "fix: regenerate GraphQL metadata types"
```

**Files involved:**
- `packages/twenty-front/src/generated-metadata/graphql.ts` - Generated types for /metadata endpoint
- `packages/twenty-front/src/generated/graphql.ts` - Generated types for /graphql endpoint
- `packages/twenty-front/codegen-metadata.cjs` - Config for metadata codegen
- `packages/twenty-front/codegen.cjs` - Config for main graphql codegen

**Prevention:**
When modifying backend GraphQL schema (DTOs, resolvers), always regenerate frontend types before committing.

### After Syncing Fork with Upstream (IMPORTANT)

**Problem:**
This is a forked repository with custom features (e.g., `recordAccessLevel`, `ownershipFieldNames` for record visibility). When syncing/merging from upstream, generated files get overwritten by upstream's version which doesn't have our custom fields.

**Affected files:**
- `packages/twenty-front/src/generated-metadata/graphql.ts` - GraphQL types
- `packages/twenty-front/src/generated/graphql.ts` - GraphQL types
- `packages/twenty-front/src/locales/generated/*.ts` - Lingui translations

**After every `git merge upstream/main` or fork sync, run:**
```bash
# 1. Switch to Node 24 (required by project)
nvm use 24
yarn install

# 2. Start backend server (in background)
npx nx start twenty-server &
# Wait ~40 seconds for server to be ready

# 3. Regenerate GraphQL types (both data and metadata)
npx nx run twenty-front:graphql:generate

# 4. Stop backend server
# pkill -f "nest start"

# 5. Make recordAccessLevel optional (to match shared types)
sed -i '' 's/recordAccessLevel: RecordAccessLevel;/recordAccessLevel?: Maybe<RecordAccessLevel>;/g' \
  packages/twenty-front/src/generated/graphql.ts \
  packages/twenty-front/src/generated-metadata/graphql.ts

# 6. Compile translations
npx lingui compile --config packages/twenty-front/lingui.config.ts

# 7. Verify TypeScript compiles
npx nx typecheck twenty-front

# 8. Commit changes
git add -A
git commit -m "fix: regenerate types and translations after upstream sync"
```

**Custom fields that may be overwritten:**
- `ObjectPermission.recordAccessLevel` - Record visibility level (EVERYTHING/OWNED_ONLY)
- `ObjectPermission.ownershipFieldNames` - Fields used for ownership-based visibility
- `RecordAccessLevel` enum - Enum for record access levels

**If GraphQL generation fails** (server not running), manually add missing fields to the generated files by referencing commit `ef67c6ca27` which has the correct types.

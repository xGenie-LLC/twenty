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
# Run tests
npx nx test twenty-front      # Frontend unit tests
npx nx test twenty-server     # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests with DB reset

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
- Use **Lingui** for internationalization
- Components should be in their own directories with tests and stories

### Testing Strategy
- **Unit tests** with Jest for both frontend and backend
- **Integration tests** for critical backend workflows
- **Storybook** for component development and testing
- **E2E tests** with Playwright for critical user flows

## Important Files
- `nx.json` - Nx workspace configuration with task definitions
- `tsconfig.base.json` - Base TypeScript configuration
- `package.json` - Root package with workspace definitions
- `.cursor/rules/` - Development guidelines and best practices

## Custom Modifications (Must be re-applied after upstream sync)

This fork includes custom modifications that may be overwritten when syncing with upstream. After each merge from upstream, verify these modifications are still in place.

### 1. Record-Level Security (RLS) / OWNED_ONLY Feature

This is a custom feature that allows restricting record visibility to only records owned by the user.

**Key files (already in codebase):**
- `packages/twenty-server/src/engine/metadata-modules/object-permission/object-permission.entity.ts` - Entity with `recordAccessLevel` and `ownershipFieldNames`
- `packages/twenty-server/src/engine/twenty-orm/repository/workspace-select-query-builder.ts` - `applyRecordAccessFilter()` method
- `packages/twenty-front/src/modules/settings/roles/role/hooks/useSaveDraftRoleToDB.ts` - Must include `recordAccessLevel` and `ownershipFieldNames` in mutation

**After upstream sync, regenerate GraphQL types:**
```bash
npx nx run twenty-front:graphql:generate
cd packages/twenty-front && npx graphql-codegen --config=codegen-metadata.cjs
```

### 2. Role Default Permissions Fix

**File:** `packages/twenty-server/src/engine/metadata-modules/workspace-permissions-cache/workspace-permissions-cache.service.ts`

In `getObjectRecordPermissionsForRoles`, default permissions should use the role's settings, not hardcoded `false`:

```typescript
// Use role's default permissions (canReadAllObjectRecords, etc.)
// These can be overridden by explicit objectPermission records
let canRead = role.canReadAllObjectRecords;
let canUpdate = role.canUpdateAllObjectRecords;
let canSoftDelete = role.canSoftDeleteAllObjectRecords;
let canDestroy = role.canDestroyAllObjectRecords;
```

**Why:** Without this fix, non-Admin roles with `canReadAllObjectRecords = true` will get PERMISSION_DENIED when accessing objects that don't have explicit `objectPermission` records (like `dashboard`). This causes the favorites query to fail because it joins related objects.

Also, keep the workflow block to always allow read:
```typescript
if (WORKFLOW_STANDARD_OBJECT_IDS.includes(standardId)) {
  const hasWorkflowsPermissions = this.hasWorkflowsPermissions(role);
  canRead = true;  // Always allow reading workflow objects
  canUpdate = hasWorkflowsPermissions;
  canSoftDelete = hasWorkflowsPermissions;
  canDestroy = hasWorkflowsPermissions;
}
```

### 3. Nested Relations authContext Fix

**File:** `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/helpers/process-nested-relations-v2.helper.ts`

In the `processRelation` method, the `getRepository()` call must include `authContext` as the third parameter:

```typescript
const targetObjectRepository = workspaceDataSource.getRepository(
  targetObjectMetadata.nameSingular,
  rolePermissionConfig,
  authContext,  // THIS LINE IS REQUIRED
);
```

**Why:** Without `authContext`, when processing nested relations (e.g., favorites -> person/company), the QueryBuilder has no access to `workspaceMemberId`. This causes OWNED_ONLY permission checks to fail with "workspaceMemberId is undefined" error, resulting in PERMISSION_DENIED for Member users querying favorites.

### 4. AI Model "auto" Alias Fix

**File:** `packages/twenty-server/src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service.ts`

In `getEffectiveModelConfig` method, add at the beginning:

```typescript
if (modelId === 'auto') {
  modelId = DEFAULT_SMART_MODEL;
}
```

## Production Deployment Notes

### Clearing Redis Permission Cache

**IMPORTANT:** Command-line Redis cache clearing does NOT work for this deployment. You MUST use Dokploy to rebuild Redis.

When you need to clear permission cache (e.g., after deploying permission logic changes):

1. Go to Dokploy dashboard
2. Find the Redis service (`crm-redis-*`)
3. Click "Rebuild" to completely rebuild the Redis container

**Why command-line doesn't work:**
- The `redis-cli DEL` command may appear to succeed but the cache is not actually cleared
- This may be due to Redis persistence settings or Docker networking issues
- Only a full Redis rebuild via Dokploy guarantees cache is cleared

**When to clear cache:**
- After deploying changes to `workspace-permissions-cache.service.ts`
- After deploying changes to permission calculation logic
- When users report seeing stale permissions (e.g., can't see objects they should have access to)

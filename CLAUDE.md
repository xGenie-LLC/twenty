# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twenty is an open-source CRM built with a modern stack in an Nx monorepo. The codebase uses React 18 with Recoil for the frontend and NestJS with TypeORM for the backend.

## Key Commands

### Development
```bash
yarn start                           # Start frontend + backend + worker
npx nx start twenty-front            # Frontend dev server only
npx nx start twenty-server           # Backend server only
npx nx run twenty-server:worker      # Background worker only
```

### Testing
```bash
# Run single test file (PREFERRED - fast)
npx jest packages/twenty-front/src/path/to/file.test.ts --config=packages/twenty-front/jest.config.mjs
npx jest packages/twenty-server/src/path/to/file.spec.ts --config=packages/twenty-server/jest.config.mjs

# Run all tests for a package
npx nx test twenty-front
npx nx test twenty-server

# Integration tests with database reset
npx nx run twenty-server:test:integration:with-db-reset

# E2E tests (Playwright)
npx nx run twenty-e2e-testing:test

# Storybook
npx nx storybook:build twenty-front
npx nx storybook:serve-and-test:static twenty-front

# When testing UI manually, click "Continue with Email" and use prefilled credentials
```

### Code Quality
```bash
npx nx lint twenty-front --fix       # Lint with auto-fix
npx nx typecheck twenty-front        # Type checking
npx nx fmt twenty-front              # Format code

# Run only affected by changes
npx nx affected --target=test --base=main
npx nx affected --target=lint --base=main
```

### Database
```bash
npx nx database:reset twenty-server                    # Reset database
npx nx run twenty-server:command workspace:sync-metadata  # Sync metadata

# Generate migration (after modifying *.entity.ts files)
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/common/[name] -d src/database/typeorm/core/core.datasource.ts
```

### GraphQL
```bash
npx nx run twenty-front:graphql:generate
```

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Recoil (state), Emotion (styling), Apollo Client, Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL Yoga, BullMQ
- **Monorepo**: Nx workspace with Yarn 4

### Package Structure
```
packages/
├── twenty-front/       # React frontend
├── twenty-server/      # NestJS backend (src/modules/, src/engine/)
├── twenty-ui/          # Shared UI components
├── twenty-shared/      # Common types and utilities
├── twenty-emails/      # Email templates (React Email)
├── twenty-e2e-testing/ # Playwright E2E tests
└── twenty-zapier/      # Zapier integration
```

## Code Conventions

### Strict Rules
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Types over interfaces** (except when extending third-party interfaces)
- **String literals over enums** (except for GraphQL enums)
- **No 'any' type** - strict TypeScript required
- **Event handlers over useEffect** for state updates

### Naming
- `camelCase` for variables/functions
- `SCREAMING_SNAKE_CASE` for constants
- `PascalCase` for types/classes
- `kebab-case` for files/directories
- Props types suffixed with `Props` (e.g., `ButtonProps`)
- **Never abbreviate** in variable names: use `user` not `u`, `fieldMetadataItem` not `f`

### State Management
- Recoil atoms for primitive global state
- Recoil selectors for derived state
- Atom families for dynamic collections
- Apollo Client manages GraphQL cache

### Utilities
Use existing helpers instead of manual checks:
```typescript
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString, isNonEmptyArray } from '@sniptt/guards';
```

### Comments
- Explain WHY, not WHAT
- Use short `//` comments, not JSDoc blocks
- Skip obvious comments that repeat what code does

## Custom Modifications (Must be re-applied after upstream sync)

This fork includes custom modifications that may be overwritten when syncing with upstream. After each merge from upstream, verify these modifications are still in place.

### 1. Record-Level Security (RLS) / OWNED_ONLY Feature

Custom feature that restricts record visibility to only records owned by the user.

**Key files:**
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
let canRead = role.canReadAllObjectRecords;
let canUpdate = role.canUpdateAllObjectRecords;
let canSoftDelete = role.canSoftDeleteAllObjectRecords;
let canDestroy = role.canDestroyAllObjectRecords;
```

**Why:** Without this fix, non-Admin roles with `canReadAllObjectRecords = true` get PERMISSION_DENIED when accessing objects without explicit `objectPermission` records (like `dashboard`).

Also keep workflow objects always readable:
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

In the `processRelation` method, `getRepository()` must include `authContext` as third parameter:

```typescript
const targetObjectRepository = workspaceDataSource.getRepository(
  targetObjectMetadata.nameSingular,
  rolePermissionConfig,
  authContext,  // THIS LINE IS REQUIRED
);
```

**Why:** Without `authContext`, nested relation queries fail OWNED_ONLY permission checks with "workspaceMemberId is undefined".

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

1. Go to Dokploy dashboard
2. Find the Redis service (`crm-redis-*`)
3. Click "Rebuild" to completely rebuild the Redis container

**When to clear cache:**
- After deploying changes to `workspace-permissions-cache.service.ts`
- After deploying changes to permission calculation logic
- When users report seeing stale permissions

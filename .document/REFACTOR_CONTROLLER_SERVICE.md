# Refactor: Controller-Service Separation + Failed-Test Remediation

Date: 2026-09-16
Scope: `backend-ts` (services, controllers, middleware, utils, seeders, tests)

## What was wrong

- 83 of 379 backend tests failing (11 suites); clean HEAD was worse (90 failing).
  Root causes: services evolved (multi-tenant headers, cache-aside, `nextSequence`
  codegen, DTO signatures) while tests still mocked the old contracts
  (`req.locals`, direct `findOne` shapes, legacy payloads); several services
  called real Sequelize models directly, bypassing the mocked `database.*` seam;
  one seeder (`20260822000001-seed-staff-users.js`) referenced by tests did not exist;
  `sanitizePermissions` (tested) was never implemented.
- Services violated Controller-Service separation: `RoleService.delete /
  assignToUser / removeFromUser` accepted HTTP `(req, res, next)`; product/invoice/
  category services queried models directly instead of the shared `database.*` seam.

## Controller layer (HTTP only now)

- Controllers parse headers/query/body and build DTOs, then call services:
  `RoleController.delete` extracts `params.id`; `assignToUser` extracts and
  coerces `{ userId, roleId, vendorId }`. Header extraction for tenant identity
  uses `getRequestedVendorId / getRequestedWarehouseId` (`x-vendor` /
  `x-warehouse` first, legacy query/body fallback).
- No business logic was added to controllers.

## Service layer (pure data in, split by responsibility)

- `services/role/sanitize-permissions.ts` (new): `sanitizePermissions`,
  `clampFlag`, `normalizeModuleKey`, `resolveModule`, `sanitizePermissionGrant`.
  Strict boolean clamp (`=== true`), lowercase canonical keys from
  `constant/modules`, throws `Unknown permission module "<name>"`.
- `services/role/index.ts`: `delete({ id })`, `assignToUser({ userId, roleId,
  vendorId? })`, `removeFromUser({...})` now take DTOs; re-exports
  `sanitizePermissions`.
- `services/categories/` (new `types.ts`): `validateCategoryCreateInput`,
  `buildCategoryListQuery` (requires `vendorId`, adds `raw: true`),
  `buildCategoryDetailQuery`; service uses the `database.category` seam and a
  guarded `generateCategoryCode` (skips codegen on non-finite counters).
- `services/product/index.ts`: all value-position model calls moved to the
  `database.*` seam (same queries); `create` split into
  `resolveCreateVariantEntries` (legacy `attributes` matrix expansion via
  `buildAttributeCombinations` + `findOverride`, `generateAll: false` keeps only
  overrides; new-contract `attributeValues` entries pass through) and
  `materializeAttributeValues` (find-or-create vendor-global rows); simple-path
  quantity validation (`Invalid quantity` for explicit non-positive/non-numeric);
  simple-path result no longer carries an empty `variants` key; new
  product-scoped `requireScopedProduct`, `getProductAttributes`,
  `createAttribute`, `updateAttribute`, `deleteAttribute` (vendor isolation +
  transaction rollback on denial).
- `services/staff/index.ts`: `create` split into `wantsLoginAccount`,
  `validateAccountInput` (email required/format, password >= 6),
  `resolveAccountRoleId` (explicit `findByPk` or default Staff lookup),
  `provisionLoginAccount` (name split, `user.create`, `user_role.create`),
  `nextStaffCode` (`NV-XXXX` via `nextSequence`), `persistStaffWithRetry`
  (single retry on `ER_DUP_ENTRY`), plus `splitFullName`, `isValidEmail`;
  explicit `userId` passes through without provisioning; `update` drops the
  fail-first lookup (whitelist + direct update, affected-row count);
  `remove` is a direct `destroy`; `getById` includes the vendor model and
  returns the row.
- `services/setting/index.ts`: `resolveActiveVendorId` uses the trusted
  workspace source only (`getActiveWorkspaceVendorId`: vendorGuard's
  `activeVendorId`, then raw `x-vendor` header — never body/query, which name
  the *requested* resource); `getVendorSettings(req, vendorId?)` falls back to
  the requested id and reads via `database.vendor.findByPk`.
- `services/invoice/index.ts`: `loadDraftInvoiceForUpdate` uses the
  `database.invoice / database.invoiceDetail` seam; header helpers typed via
  `IInvoiceModel`.
- `services/authenticate/index.ts`: unchanged (already DTO-based:
  `get(id)`, `login({ email, password })`, `register(params)`).
- `utils/tenant.ts`: new `getActiveWorkspaceVendorId` (guard/header only);
  `vendorGuard` exposes validated `req.activeVendorId`.
- `seeders/20260822000001-seed-staff-users.js` (new): idempotent Staff-role +
  10-grant preset + demo user/vendor/main-warehouse seeding with read-back
  SELECTs (never trusts `bulkInsert` ids) and orphan-only `down()`.

## Tests

- Rewritten to the real contracts (same behavior assertions, correct seams):
  `authorize` (req.user + mocked `loadUserAuthContext`), `authenticate`
  (DTO calls + direct-model mocks), `product` / `variants` / `excel`
  (entity-cache passthrough, `database.*` mocks, vendor scopes, value
  registry for matrix tests), `staff` untouched (service now meets the spec).
- Result: **34 files, 383 tests, all passing** (was 11 failed files / 83 failed tests).
- `npx tsc` on touched source files is clean; remaining repo-wide
  `tsc` noise is pre-existing (test-mock typings, `ignoreDeprecations` flag
  vs local TS 5.8.3, eslint config import error) and was left untouched.

# Implementation: Import Order · Financial · Staff · Shift

**Date Started**: 2026-08-21
**Date Completed**: 2026-08-21
**Target**: `backend-ts` (active backend) + `client` (Remix FE)
**Status**: ✅ Implemented (backend + frontend typecheck clean)

---

## Design Decisions (confirmed with user)
- **Import Order** reuses `order` + `orderDetail` tables (provider-scoped: `providerId != null`, `type='0'` IN so inventory increments). No new table.
- **Financial** = `financialRecord` voucher table (revenue/expense) + `/financial/report` aggregation. Order creation auto-creates a voucher (revenue for sales, expense/import-cost for provider imports).
- **Staff** = new `staff` table (separate from auth `user`), optional link via `userId`.
- **Shift** = new `shift` table ("chốt ca"): open/close with cash reconciliation; closing computes expected cash from vouchers since open.
- **RBAC**: `staff` and `shift` added to the permission `MODULES` array so `PermissionGuard` works.

---

## Backend (`backend-ts`) — DONE

### New Models + Types
- `src/database/models/financialRecord.ts` + `src/types/financialRecord.d.ts`
- `src/database/models/staff.ts` + `src/types/staff.d.ts`
- `src/database/models/shift.ts` + `src/types/shift.d.ts`

### Services / Controllers / Routers
- `src/services/importOrder/index.ts` (NEW) + `src/controllers/importOrder/index.ts` (NEW) + `src/routers/importOrder/index.ts` (REWRITTEN from broken `require` stub)
- `src/services/financial/index.ts` (EXTENDED: vouchers CRUD + `getReport`) + `src/controllers/financial/index.ts` + `src/routers/financial/index.ts`
- `src/services/staff/index.ts` (NEW) + controller + `src/routers/staff/index.ts`
- `src/services/shift/index.ts` (NEW) + controller + `src/routers/shift/index.ts`
- `src/routers/index.ts` — registered `/staff` and `/shift`
- `src/services/order/index.ts` — `updateInventory` now branches on `type` (import ⇒ increment), plus `createFinancialVoucher` auto-hook

### API endpoints added
- `GET/POST /api/import-order`, `GET /api/import-order/:id`
- `GET/POST /api/financial`, `GET /api/financial/:id`, `GET /api/financial/report`
- `GET/POST/PUT/DELETE /api/staff`, `GET /api/staff/:id`
- `GET/POST /api/shift`, `GET /api/shift/:id`, `GET /api/shift/current`, `POST /api/shift/open`, `POST /api/shift/:id/close`

---

## Frontend (`client`) — DONE

### Types
- `app/types/financial.d.ts` (extended: `IFinancialRecord`, `IFinancialReport`, `IFinancialQueryParams`)
- `app/types/staff.d.ts` (NEW), `app/types/shift.d.ts` (NEW)
- `app/types/provider.d.ts` (extended: `IImportOrder`, `warehouseId` on query)

### Schemas
- `app/constants/schema/financial.ts`, `staff.ts`, `shift.ts` (NEW)

### Services
- `app/action.server/financial.service.ts` (extended), `importOrder.service.ts` (extended)
- `app/action.server/staff.service.ts` (NEW), `shift.service.ts` (NEW)

### Pages
- `financial/route.tsx` (list, refactored to vouchers), `financial/add/route.tsx` (voucher form), `financial/$id/route.tsx` (detail), **`financial/report/route.tsx` (NEW tax report)**
- `import-order/index.tsx` (list, `warehouseId`), `import-order/add/route.tsx` (fixed action `warehouseId` + `orderDetails` field name), `import-order/$id/route.tsx` (detail)
- `staff/index.tsx` (list, built), `staff/add/route.tsx` (NEW), `staff/$id/route.tsx` (NEW detail/edit)
- `shift/index.tsx` (list + open/close UI, built), `shift/$id/route.tsx` (NEW detail)

### i18n / RBAC / Sidebar
- `app/assets/lang/en.json` + `vi.json`: added `staff`, `shift` namespaces; extended `financial`, `importOrder`
- `app/components/role/index.tsx`: added `staff`, `shift` to `MODULES`

---

## Verification
- `backend-ts`: `npx tsc --noEmit` — 0 errors in feature files.
- `client`: `npx tsc --noEmit` — 0 errors in feature files.
- DB tables auto-created via `sequelize.sync({alter:true})` on startup (models auto-loaded from `src/database/models/`).

## Notes / Follow-ups
- Tax report computes revenue/expense from `financial_records`; VAT estimated from sales orders in range. Export-to-Excel buttons are placeholders (wire to `xlsx` when needed).
- To populate data: create Staff, open a Shift, create Import Orders (auto vouchers), then view the Financial report.
- Permission: `staff`/`shift` modules now appear in the RBAC matrix; assign permissions to roles as desired.

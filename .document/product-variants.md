# Plan: Product Variants (attribute-based, WooCommerce style)

Feature: products can define variant **attributes** (e.g. Color, Size); each attribute
combination becomes a sellable **variant** with its own SKU, prices and stock.
Stock, transfers, orders and history all operate at the variant level when the
product has variants; products without variants keep working exactly as today
(100% backwards compatible).

## Current state (investigation summary)

- `products` — flat record per sellable item (`skuCode`, prices, `sold`, `isNegative`).
- `inventories` — stock per `(productId, warehouseId)`.
- `transfers` — IN/OUT ledger per `(productId, warehouseId)` (`type '0' = IN, '1' = OUT`).
- `ProductService.create` — one transaction: product → inventory row → transfer `type '0'`; code/SKU generated from vendor `settings`.
- `OrderService.createOrderDetails` → `updateInventory` (increment/decrement + `isNegative` stock guard), `updateProductQuantity` (`sold`++), `createTransfer`.
- `getProducts` joins inventories by `warehouseId`, sums quantity via raw subquery on `productId`.
- Schema: models auto-loaded from `backend-ts/src/database/models/*.ts`, `sequelize.sync()` + guarded migrations in `backend-ts/migrations/`.
- Client is a Remix app (`client/app`) — product pages at
  `routes/_index+/products+/{index,add,$id}`, order form at
  `components/form/order-form`.

## Design decisions

- Attribute-based model (user choice): attributes defined per product,
  combinations auto-generate variant rows (like WooCommerce).
- Variant-level stock: `inventories.variantId` / `transfers.variantId` nullable FKs.
  `variantId IS NULL` = legacy/simple-product stock.
- Products without variants ("simple products") behave identically to today.

## Phase 1 — Backend data layer

1. **New model** `backend-ts/src/database/models/productAttribute.ts`
   - Fields: `id`, `name` (STRING, e.g. "Color"), `productId` (FK → products).
   - Association: `hasMany(productAttributeValue)`. Table name: `productAttributes`.

2. **New model** `backend-ts/src/database/models/productAttributeValue.ts`
   - Fields: `id`, `value` (STRING, e.g. "Red"), `attributeId` (FK),
     `productId` (FK, denormalized for easy queries).
   - Table name: `productAttributeValues`.

3. **New model** `backend-ts/src/database/models/productVariant.ts`
   - Fields: `id`, `productId` (FK), `skuCode` (STRING, unique per vendor),
     `code` (STRING, nullable — follows existing code-generation pattern),
     `salePrice`, `regularPrice`, `wholeSalePrice`, `costPrice`
     (nullable BIGINT/INTEGER mirroring `products`; fallback = parent values),
     `sold` (INTEGER, default 0), `isActive` (BOOLEAN, default true).
   - Type defs in `backend-ts/src/types/productVariant.d.ts` +
     attribute types in `types/product.d.ts` or new file, following the
     `I<X>Model` / `I<X>Static` convention.

4. **Junction table** `product_variant_attribute_values` (belongsToMany through)
   - Links each variant to its exact attribute-value combination
     (e.g. Red + XL). Unique constraint on `(productVariantId, productAttributeValueId)`.

5. **Model edits**
   - `product.ts`: `hasMany(productAttribute)`, `hasMany(productVariant)`.
   - `inventory.ts`: add nullable `variantId` column; associate
     `belongsTo(productVariant)`.
   - `transfer.ts`: add nullable `variantId` column; associate `belongsTo(productVariant)`.
   - `orderDetail.ts`: add nullable `variantId` (so orders record which variant sold);
     snapshot `skuCode`/`name` into existing `note`/new fields if cheap.

6. **Migration** `backend-ts/migrations/<date>-add-product-variants.js`
   - Follow the guarded style of `20260824000000-add-negative-stock-and-vendor-settings.js`
     (`columnExists` / `addColumnIfMissing` helpers):
     - create `productAttributes`, `productAttributeValues`, `productVariants`,
       junction table;
     - add nullable `variantId` to `inventories`, `transfers`, `orderDetails`;
     - add index on `(productId, warehouseId, variantId)` where supported.

## Phase 2 — Backend services

7. **ProductService.create**
   - Accept optional `attributes: [{ name, values: string[] }]` and
     `variants: [{ skuCode?, prices..., optionValues: {Color: 'Red', Size: 'XL'} }]` in body.
   - Persist attributes/values; generate variant rows for the cartesian product
     of attribute values (auto-create missing combos like WooCommerce);
     auto-generate per-variant SKU from parent template (reuse
     `generateSkuFromTemplate` with an extra `ATTR` token, e.g. `{CODE}-RED-XL`).
   - For simple products (no attributes): unchanged behavior.

8. **Inventory & stock semantics** (touch `OrderService.updateInventory`,
   `TransferService`, product creation's initial inventory/transfer):
   - Resolve target: if payload has `variantId`, use it; else fall back to product-level row.
   - Stock guard in `updateInventory`: check `isNegative` from the **variant's
     parent product** (or a future `productVariants.isNegative` override);
     insufficient-stock error message includes variant SKU.
   - Initial inventory on create: one row per variant (+ parent row only for
     simple products). Same for the opening IN transfer per variant.

9. **Queries**
   - `getProducts`: quantity subquery must aggregate correctly —
     sum over inventories where `variantId IS NULL` stays "stock" for simple
     products; for variable products return aggregated stock across variants
     (e.g. `SUM(quantity)` regardless of variant) plus `variantCount`.
     Keep it SQL-literal based as today to avoid N+1.
   - New endpoint(s) in `routers/product/index.ts`:
     - `GET /products/:id/variants` — list variants with per-warehouse stock.
     - `POST/PUT /products/:id/variants` — upsert variant prices/sku/status.
     - `GET /products/:id/attributes` (or include in `getProductById`).
   - `getProductById`: include attributes + values + variants.
   - `TransferService.getHistoryByProductId`: accept optional `variantId` filter;
     join variant table for display names/SKUs.

10. **Order flow**
    - `orderDetails` payloads may carry `variantId`; pass it through
      `createOrderDetails` → `updateInventory` / `createTransfer` /
      variant-level `sold` increment (parent product `sold` also incremented
      so existing reports stay correct).

## Phase 3 — Client (Remix)

11. **Types & API layer** — mirror new fields in `client/app/types`, extend
    `client/app/http` calls for the new endpoints.

12. **Product form** (`routes/_index+/products+/add`)
    - UI section "Variants": dynamic attribute editor (add attribute → add
      value chips), preview grid of generated combinations, per-combo
      SKU/price inputs, bulk-fill price/SKU helpers.
    - Simple vs variable toggle: leaving attributes empty keeps current UX.

13. **Product list** (`routes/_index+/products+/index.tsx`)
    - Show variant badge/count; expandable sub-rows or drill-in listing
      variant SKUs with per-variant stock.

14. **Product detail** (`$id`) — tabs: General / Attributes / Variants
    (variant table: SKU, prices, stock per warehouse, sold, active toggle).

15. **Order/invoice forms** (`components/form/order-form`, invoices add page)
    - Product picker shows variant selector when a variable product is chosen;
      selected line items submit `productId` + `variantId`; show per-variant
      available stock and reuse existing insufficient-stock error handling.

16. **History/transfers views** — display variant SKU/name next to product
    where applicable.

## Phase 4 — Tests & verification

17. Unit tests following existing `__tests__` conventions:
    - variant generation from attribute matrix (cartesian product, dedup);
    - SKU generation with attribute tokens;
    - `updateInventory` with `variantId` (guard, decrement, not-found cases);
    - order detail flow with mixed simple/variable lines.
18. Manual verification checklist:
    - create simple product → behavior identical to before;
    - create variable product → initial inventory + IN transfers per variant;
    - sell a variant → inventory decremented, transfer OUT recorded,
      variant + parent `sold` bumped, financial voucher unchanged;
    - stock guard blocks negative unless `isNegative`;
    - migration re-runnable against drifted DBs.

**Round 3 fixes / enhancements (2026-08-24)**
- **Fixed blank Product/$id**: nested includes of `productAttributeValue` were
  missing their association aliases (`as: 'values'` under productAttribute,
  `as: 'attributeValues'` under productVariant) — the loader threw and the
  page rendered empty. Also fixed the same aliases in `getProductVariants`,
  `backfillVariants`, `deleteVariantsByValueIds`. Diagnostic script kept at
  `backend-ts/scripts/check-product-detail.ts`.
- **Product image**: `products.image` column (model + migration +
  applied to live DB), URL field with live preview on the add form, shown on
  the detail page.
- **Money step setting**: `settings.moneyStep` (default 1000, migration
  applied), editable in Setting → General ("Bước nhảy tiền tệ"); wired into
  all price +/- steppers (product form prices, variant combo grid).
- **VariantEditor combo grid** now uses TMTable (no raw table markup).
- **Sidebar**: Product is now a parent with children List (/products) and
  Attributes (/products/attributes). New global attributes page (TMTable,
  click-through to the owning product) backed by `GET /products/attributes`
  registered before `/:id`.
- **History moved into a "Lịch sử" tab** on Product/$id (same Tab pattern as
  add-product); edit button restored.
- **i18n**: static strings in variant UI, attribute panel, tabs, picker modal
  and settings moved to lang keys (`product.*`, `settings.*`,
  `sidebar.productList`, `sidebar.attributes`, `common.*`) in vi.json/en.json.



Phase 1 → 2 (services) → tests for backend core → Phase 3 client → Phase 4.
Each phase leaves the app working (null `variantId` paths untouched first).

## Suggested implementation order

## Implementation status (2026-08-24)

**Phase 1 — Data layer: DONE**
- New models: `database/models/productAttribute.ts`, `productAttributeValue.ts`, `productVariant.ts`
- Types: `types/productAttribute.d.ts`, `types/productVariant.d.ts`
- `inventories` / `transfers` / `orderDetails` gained nullable `variantId`
- Migration: `migrations/20260824010000-add-product-variants.js` (guarded, re-runnable)

**Phase 2 — Backend services: DONE**
- `utils/variant.ts`: attribute-matrix cartesian product, variant SKU builder
  (`{BASE}-RED-XL`, collision-safe), override matcher
- `ProductService.create`: accepts `attributes` + optional per-combo
  `variants` overrides (quantity/salePrice/skuCode); creates one inventory row +
  opening IN transfer **per variant**; simple products unchanged
- `OrderService`: `variantId` flows through orderDetails → inventory guard /
  decrement → transfer creation; variant `sold` counter kept in sync;
  insufficient-stock errors include the variant SKU
- `TransferService.getHistoryByProductId`: optional `variantId` filter,
  includes variant SKU
- New endpoints: `GET /products/:id/variants`,
  `PUT /products/:id/variants/:variantId`
- `getProductById` now includes attributes (+values) and variants

**Phase 4 (backend tests): DONE**
- `src/utils/__tests__/variant.test.ts` (9 tests)
- `src/services/order/__tests__/order.service.test.ts` (8 tests)
- Full suite: 145/146 pass (1 pre-existing failure in customer.service.test.ts,
  fails on clean tree too)

**Phase 3 — Client: DONE (RHF rework round 2)**
- VariantEditor rewritten fully on react-hook-form:
  - attribute rows live in the parent product form under
    `variantAttributes` via `useFieldArray` (fixes the stale-render bug where
    "+ Thêm thuộc tính" appeared to do nothing)
  - per-combination stock/price registered dynamically under
    `variantOverrides.<i>.*`; combos derived with `useWatch`
  - submit payload built from form values; manual useState removed
- Product add page: variants live in their own tab ("Biến thể") inside the
  shared `<form>`; payload assembly moved into RHF `onSubmit`
- Product detail page: sub-navigation tabs
  - "Tổng quan" (detail / edit form)
  - "Biến thể" (variant table)
  - "Thuộc tính" — full CRUD panel for attributes (add / rename+values /
    delete) wired through the route action and Remix revalidation

**Backend attribute CRUD (round 2): DONE**
- New endpoints:
  - `GET /products/:id/attributes`
  - `POST /products/:id/attributes` `{ name, values[] }` — find-or-create
    attribute + values, then **backfills missing variant combinations**
  - `PUT /products/:id/attributes/:attributeId` `{ name?, values? }` — rename,
    sync values; removing values deletes the variants that used them
  - `DELETE /products/:id/attributes/:attributeId` — cascades to values,
    junction rows and dependent variants
- Client service methods added for all of the above

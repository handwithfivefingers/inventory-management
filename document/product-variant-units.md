# Product variants, units and stock

Updated: 2026-09-18

Stock is stored in `inventories` in the base unit, scoped by `(variantId,
warehouseId)`. Each variant has exactly one `product_barcodes` pricing row with
`conversionRate = 1`; this is its base unit. Other barcode rows represent
selling packs and contain their own conversion rate and prices.

The API requires `X-Warehouse` for product writes and barcode stock movements.
`POST /api/products/stock/by-barcode` accepts `{ barcode, quantity, type }`,
where type is `IN` or `OUT`, converts to base units and records a `Transfer` in
the same transaction. Outbound stock is rejected with `INSUFFICIENT_STOCK`
unless the variant enables `isNegative`.

`GET /api/products/:id/full` returns warehouse-scoped `baseQuantity` and, for
each barcode row, `stock.quantity` plus `stock.remainder`; clients should use
those values instead of recomputing cross-warehouse stock.

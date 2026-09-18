# Barcode and conversion-rate

Updated: 2026-09-18

`product_barcodes` is the selling-unit catalogue for one product variant. Inventory remains stored in the base unit; a barcode's `conversionRate` converts its scanned quantity to that base unit.

On the product create/edit screen, the base-unit toggle is intentionally not exposed. The API derives `isBaseUnit` from `conversionRate`: a rate of `1` is the base unit and any rate greater than `1` is a converted unit. Each variant must still contain exactly one rate-`1` barcode.

Migration `20260918000002-create-product-barcodes.js` copies legacy `productVariants.code` rows. It creates a vendor-owned `Base unit` when needed and stops if a legacy barcode cannot be assigned one. Before the destructive follow-up migration, run the validation SQL embedded in that migration and require `legacyBarcodeCount = migratedBarcodeCount` and `missingBarcodeCount = 0`.

MySQL cannot create a partial unique index. The table therefore has a generated nullable `baseVariantId` and a unique index on it: only `isBaseUnit = true` rows produce a non-null value, so each variant has at most one base barcode. Creation flows must still require one base row; the index cannot enforce “at least one”.

`20260918000003-add-order-detail-barcode-snapshots.js` adds `barcodeId`, `priceAtSale`, `conversionRateAtSale`, and `unitNameAtSale` to `orderDetails`. Order creation requires `barcodeId`, resolves the retail/promotion or wholesale price on the server, and deducts `quantity × conversionRate` from base-unit inventory.

`20260918000004-remove-legacy-variant-barcode-prices.js` is a normal forward-only migration. It first blocks unless every active variant has exactly one base barcode, then removes `code`, `salePrice`, `regularPrice`, `wholeSalePrice`, and `costPrice` from `productVariants`. It has no down migration; restore a backup to reverse the cutover.

The frontend derives product-list prices, variant-picker prices, sales-order prices, POS prices, and import costs from the base barcode (`isBaseUnit = true`). It applies `promoPrice` only inside its optional promotion period. The temporary legacy fields on the frontend variant type are read-only compatibility fallbacks for older API responses and must not be submitted as variant fields.

Audit legacy callers before that migration with:

```bash
rg -n "\\b(code|salePrice|regularPrice|wholeSalePrice|costPrice)\\b" backend-ts/src
```

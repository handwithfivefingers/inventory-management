# Barcode and conversion-rate

Updated: 2026-09-19

`product_barcodes` is the selling-unit catalogue for one product variant. Inventory remains stored in the base unit; a barcode's `conversionRate` converts its scanned quantity to that base unit.

On the simple-product create/edit screen, `barcodes[0]` is always rendered as the base row. Its `conversionRate` is fixed at `1` and it cannot be removed. Users can add or remove subsequent barcode rows; their conversion rates must be integers greater than `1`, and a unit can be selected only once per variant. The submitted barcode objects remain limited to barcode, unit, conversion-rate, and pricing fields; generated database fields are never sent by the client.

Migration `20260918000002-create-product-barcodes.js` copies legacy `productVariants.code` rows. It creates a vendor-owned `Base unit` when needed and stops if a legacy barcode cannot be assigned one. Before the destructive follow-up migration, run the validation SQL embedded in that migration and require `legacyBarcodeCount = migratedBarcodeCount` and `missingBarcodeCount = 0`.

MySQL cannot create a partial unique index. Migration `20260918000007-constrain-inventory-and-barcode-units.js` therefore adds a generated nullable `baseConversionVariantId` column and a unique index on it: rows whose `conversionRate = 1` produce their `variantId`, so each variant has at most one base barcode. This is a database-generated constraint, not an API field. Creation flows must still require one base row because the index cannot enforce “at least one”.

`20260918000003-add-order-detail-barcode-snapshots.js` adds `barcodeId`, `priceAtSale`, `conversionRateAtSale`, and `unitNameAtSale` to `orderDetails`. Order creation requires `barcodeId`, resolves the retail/promotion or wholesale price on the server, and deducts `quantity × conversionRate` from base-unit inventory.

`20260918000004-remove-legacy-variant-barcode-prices.js` is a normal forward-only migration. It first blocks unless every active variant has exactly one base barcode, then removes `code`, `salePrice`, `regularPrice`, `wholeSalePrice`, and `costPrice` from `productVariants`. It has no down migration; restore a backup to reverse the cutover.

The frontend derives product-list prices, variant-picker prices, sales-order prices, POS prices, and import costs from the base barcode (`isBaseUnit = true`). It applies `promoPrice` only inside its optional promotion period. The temporary legacy fields on the frontend variant type are read-only compatibility fallbacks for older API responses and must not be submitted as variant fields.

Audit legacy callers before that migration with:

```bash
rg -n "\\b(code|salePrice|regularPrice|wholeSalePrice|costPrice)\\b" backend-ts/src
```

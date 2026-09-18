# Product variant barcode

Updated: 2026-09-18

`productVariants.code` accepts an optional barcode of up to 12 characters. Manual values may contain ASCII letters, digits, and hyphens; spaces and other symbols are rejected. Empty values clear the barcode.

When a barcode is generated automatically, the service creates a numeric value and increments it to avoid duplicates. A database migration narrows the column to `VARCHAR(12)` and adds the same validation constraint. Existing invalid rows must be corrected before that migration can run.

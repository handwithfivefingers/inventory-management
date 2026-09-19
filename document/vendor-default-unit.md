# Vendor default unit

Updated: 2026-09-19

Each vendor now has one explicitly identified default unit. Registration creates it in the same transaction as the user, vendor, warehouse, and staff records:

- Vietnamese (`vi`, the default): `Cái`
- English (`en`): `Piece`

`units.isDefault` is protected identity, not a name-based convention. The unit can be renamed, but the API rejects deletion. Migration `20260919000001-add-vendor-default-unit.js` adds a generated nullable vendor key with a unique index so MySQL permits at most one default per vendor.

New product base barcodes use this unit at conversion rate `1`. The server rejects new variant payloads that select another base unit, while existing barcode rows remain unchanged when opened or saved. Existing vendors are not automatically assigned a default unit by the migration.

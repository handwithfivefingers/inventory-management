/**
 * Global barcode (`code`) rules for products & product variants.
 *
 * Barcodes are printed/scanned as CODE128, so any printable characters are
 * allowed — the only global requirement is a minimum length of 12
 * characters (after trimming). Blank (`null`/`undefined`/`''`) means
 * "no barcode set" and is allowed at the DB/service layer; any non-blank
 * value must satisfy the minimum length.
 */

/** Minimum barcode length (trimmed) for product & variant `code`. */
export const MIN_BARCODE_LENGTH = 12

/** Trim a barcode input; returns `null` for missing/blank values. */
export const normalizeBarcode = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

/** True when `value` is blank (allowed = "no barcode") or meets the min length. */
export const isValidBarcode = (value: unknown): boolean => {
  const normalized = normalizeBarcode(value)
  if (normalized === null) return true
  return normalized.length >= MIN_BARCODE_LENGTH
}

/**
 * Throw a 400-style `Error` (with `status = 400`) when a non-blank barcode
 * is shorter than {@link MIN_BARCODE_LENGTH}. Returns the trimmed value
 * (or `null` for blank input) so callers can store the normalized form.
 */
export const assertValidBarcode = (value: unknown, field = 'code'): string | null => {
  const normalized = normalizeBarcode(value)
  if (normalized === null) return null
  if (normalized.length < MIN_BARCODE_LENGTH) {
    throw Object.assign(new Error(`${field} must be at least ${MIN_BARCODE_LENGTH} characters`), { status: 400 })
  }
  return normalized
}

/**
 * Global barcode (`code`) rules for products & product variants.
 *
 * Blank (`null`/`undefined`/`''`) means "no barcode set" and is allowed at
 * the DB/service layer. Any non-blank value must contain only letters,
 * digits, or hyphens and be no longer than 12 characters. Automatically generated
 * values are numeric.
 */

/** Maximum barcode length (trimmed) for product & variant `code`. */
export const MAX_BARCODE_LENGTH = 12
export const BARCODE_PATTERN = /^[A-Za-z0-9-]{1,12}$/

/** Trim a barcode input; returns `null` for missing/blank values. */
export const normalizeBarcode = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

/** True when `value` is blank (allowed = "no barcode") or is a numeric barcode. */
export const isValidBarcode = (value: unknown): boolean => {
  const normalized = normalizeBarcode(value)
  if (normalized === null) return true
  return BARCODE_PATTERN.test(normalized)
}

/**
 * Throw a 400-style `Error` (with `status = 400`) when a non-blank barcode
 * contains characters outside `[A-Za-z0-9-]` or is longer than
 * {@link MAX_BARCODE_LENGTH}. Returns the trimmed value (or `null` for blank
 * input) so callers can store it.
 */
export const assertValidBarcode = (value: unknown, field = 'code'): string | null => {
  const normalized = normalizeBarcode(value)
  if (normalized === null) return null
  if (!BARCODE_PATTERN.test(normalized)) {
    throw Object.assign(new Error(`${field} must contain only letters, digits, and hyphens and be at most ${MAX_BARCODE_LENGTH} characters`), {
      status: 400
    })
  }
  return normalized
}

import { ApiError } from '#/response'
import { assertValidBarcode } from '#/utils/barcode'

/**
 * The client sends prices as strings and "" when a field is cleared.
 * MySQL strict mode rejects "" for BIGINT/INT columns ("Data truncated"),
 * so coerce blanks to NULL and numeric strings to numbers.
 */
export const toPrice = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) throw ApiError.badRequest(`Invalid ${field}: must be a number`)
  return n
}

/**
 * Normalize a VAT percent (client sends `VAT` as string/number/"").
 * Blank clears to NULL; otherwise must be a finite number in [0, 100].
 */
export const toVat = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) throw ApiError.badRequest('Invalid VAT: must be a number')
  if (n < 0 || n > 100) throw ApiError.badRequest('Invalid VAT: must be between 0 and 100')
  return n
}

/**
 * Normalize a string into an uppercase, hyphen-separated code segment:
 * strips diacritics, maps đ/Đ -> d, and collapses non [A-Z0-9] runs to '-'.
 * e.g. "Đỏ - Size L" -> "DO-SIZE-L"
 */
export const sanitizeCodeSegment = (value: string): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Make `candidate` unique against `taken` by appending `-2`, `-3`, ... Mutates `taken`. */
const dedupe = (candidate: string, taken: Set<string>): string => {
  let result = candidate
  let n = 2
  while (taken.has(result)) {
    result = `${candidate}-${n}`
    n += 1
  }
  taken.add(result)
  return result
}

export interface ResolveVariantCodeOptions {
  /** On update, treat "no code key sent" as "leave untouched" rather than auto-generating. */
  allowBlankUpdate?: boolean
}

/**
 * Resolve a variant barcode (`code`).
 * - Manual value wins (trimmed, must be >= 12 chars when non-blank).
 *   Empty string clears to null so blank is allowed.
 * - Missing/undefined on create falls back to `{productCode}-{segments}` when the
 *   parent has a barcode; otherwise stays null (manual entry before General
 *   settings are switched on).
 * - Missing/undefined on update with `allowBlankUpdate` returns undefined,
 *   meaning "don't touch the existing value".
 */
export const resolveVariantCode = (
  productCode: string | null | undefined,
  inputCode: unknown,
  segments: string[],
  taken: Set<string>,
  opts: ResolveVariantCodeOptions = {}
): string | null | undefined => {
  const hasKey = inputCode !== undefined
  if (hasKey) {
    const trimmed = String(inputCode ?? '').trim()
    // Explicit empty string: allow blank barcode (return null = cleared).
    if (!trimmed) return null
    try {
      assertValidBarcode(trimmed, 'variants[].code')
    } catch (error) {
      throw ApiError.badRequest((error as Error).message)
    }
    return dedupe(trimmed, taken)
  }

  if (opts.allowBlankUpdate) return undefined

  const base = String(productCode ?? '').trim()
  if (!base) return null

  const suffix = segments.map(sanitizeCodeSegment).filter(Boolean).join('-')
  return dedupe(suffix ? `${base}-${suffix}` : base, taken)
}

/**
 * Resolve one string field for an update payload: `undefined` means "leave
 * untouched", `null` clears it, and a blank string clears it only when
 * `allowEmptyToNull` is set (otherwise a blank string means "no change").
 */
export const resolveStringField = (value: unknown, allowEmptyToNull: boolean): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = String(value).trim()
  if (trimmed === '') return allowEmptyToNull ? null : undefined
  return trimmed
}

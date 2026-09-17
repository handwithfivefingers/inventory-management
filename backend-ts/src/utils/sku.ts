import { ApiError } from '#/response'
import { Op } from 'sequelize'
import ProductVariant from '#/database/models/productVariant'

/**
 * Strict SKU rules for Product Variants (shared by create / update / Excel import).
 *
 * - Normalization: `.trim()` + `.toUpperCase()` before validation.
 * - Pattern: `^[A-Z0-9_-]{3,30}$` (no spaces, no special/accented chars).
 * - Uniqueness: globally unique across all active (non-deleted) variants.
 */

export const SKU_PATTERN = /^[A-Z0-9_-]{3,30}$/

export const SKU_FORMAT_MESSAGE =
  'SKU must be 3-30 characters long and contain only uppercase letters, numbers, hyphens (-), and underscores (_). No spaces allowed.'

export const duplicateSkuMessage = (sku: string): string => `SKU '${sku}' is already in use by another variant.`

/** Trim + uppercase. Returns `''` for missing values so callers can detect "not provided". */
export const normalizeSku = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim().toUpperCase()
}

/**
 * Validate a normalized SKU against {@link SKU_PATTERN}.
 * Throws a 400 `ApiError` with {@link SKU_FORMAT_MESSAGE} on mismatch.
 * Returns the normalized SKU so callers store the canonical form.
 */
export const assertValidSku = (value: unknown, field = 'sku'): string => {
  const normalized = normalizeSku(value)
  if (!SKU_PATTERN.test(normalized)) {
    throw ApiError.badRequest(SKU_FORMAT_MESSAGE, { fields: { [field]: value } })
  }
  return normalized
}

/**
 * Returns true when `value` (after normalization) satisfies the SKU pattern.
 * Blank/missing values return false.
 */
export const isValidSku = (value: unknown): boolean => SKU_PATTERN.test(normalizeSku(value))

export interface AssertUniqueVariantSkuOptions {
  /** Exclude this variant row from the clash check (update flow). */
  excludeVariantId?: number | string | null
  /** Sequelize transaction to run the lookup in. */
  transaction?: unknown
}

/**
 * Throw a 409 conflict when `sku` (normalized) is already used by another
 * active variant. Active = paranoid default scope (soft-deleted rows ignored).
 */
export const assertUniqueVariantSku = async (sku: string, opts: AssertUniqueVariantSkuOptions = {}): Promise<void> => {
  const where: Record<string, unknown> = { skuCode: sku }
  if (opts.excludeVariantId !== undefined && opts.excludeVariantId !== null && String(opts.excludeVariantId) !== '') {
    where.id = { [Op.ne]: Number(opts.excludeVariantId) }
  }
  const existing = await (ProductVariant as any).findOne({
    where,
    attributes: ['id'],
    ...(opts.transaction ? { transaction: opts.transaction } : {})
  })
  if (existing) throw ApiError.conflict(duplicateSkuMessage(sku))
}

/**
 * Normalize + format-validate + globally-unique-validate a variant SKU.
 * Returns the normalized SKU for storage.
 */
export const resolveVariantSku = async (
  value: unknown,
  opts: AssertUniqueVariantSkuOptions & { field?: string } = {}
): Promise<string> => {
  const normalized = assertValidSku(value, opts.field ?? 'sku')
  await assertUniqueVariantSku(normalized, opts)
  return normalized
}

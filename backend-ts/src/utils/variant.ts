/**
 * Helpers for attribute-based product variants.
 * A product defines attributes ({ name: 'Color', values: ['Red', 'Blue'] })
 * and every combination of values becomes one sellable variant.
 */

import { generateSkuFromTemplate } from './code-generator'

export interface IVariantAttributeInput {
  name: string
  values: string[]
}

export type IVariantOptionMap = Record<string, string>

/**
 * Sanitize an attribute value for use inside an SKU segment.
 * Vietnamese/accented characters are transliterated first ("Đỏ" -> "DO",
 * "Trắng" -> "TRANG"), otherwise stripping non A-Z characters would eat
 * whole words and produce broken SKUs.
 */
const skuSegment = (value: string) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Build the cartesian product of attribute values.
 * e.g. [{name:'Color',values:['Red']},{name:'Size',values:['S','M']}]
 *   -> [{Color:'Red',Size:'S'}, {Color:'Red',Size:'M'}]
 */
export function buildAttributeCombinations(attributes: IVariantAttributeInput[]): IVariantOptionMap[] {
  const usable = (attributes || []).filter((a) => a && a.name && Array.isArray(a.values) && a.values.length > 0)
  if (usable.length === 0) return []

  let combos: IVariantOptionMap[] = [{}]
  for (const attr of usable) {
    const next: IVariantOptionMap[] = []
    for (const combo of combos) {
      for (const value of attr.values) {
        next.push({ ...combo, [attr.name]: value })
      }
    }
    combos = next
  }
  return combos
}

/**
 * Derive a unique variant SKU from the parent SKU plus its option values,
 * e.g. base 'PRD00001', { Color:'Red', Size:'XL' } -> 'PRD00001-RED-XL'.
 * Collisions get a numeric suffix (-2, -3, ...) via the takenSkus set.
 */
export function buildVariantSku(baseSku: string, options: IVariantOptionMap, takenSkus: Set<string>): string {
  const suffix = Object.keys(options || {})
    .sort()
    .map((key) => skuSegment(options[key]))
    .filter(Boolean)
    .join('-')

  let candidate = suffix ? `${baseSku}-${suffix}` : baseSku
  let n = 2
  while (takenSkus.has(candidate)) {
    candidate = `${baseSku}-${suffix}-${n}`
    n += 1
  }
  return candidate
}

/**
 * Variant SKU honoring the vendor SKU template from settings.
 * The template is resolved against the parent SKU ({CODE}/{SEQ}/{CATEGORY}/{YYYY})
 * and the attribute segments are appended, e.g. with template "{CODE}-{YYYY}"
 * and base "SP00001", { Màu: 'Đỏ' } -> "SP00001-2026-DO".
 * Falls back to plain buildVariantSku when no template is configured.
 */
export function buildVariantSkuWithTemplate(
  template: string | undefined | null,
  baseSku: string,
  options: IVariantOptionMap,
  takenSkus: Set<string>
): string {
  const templatedBase =
    template && template.trim()
      ? generateSkuFromTemplate(
          template,
          { CODE: baseSku, YYYY: String(new Date().getFullYear()) },
          baseSku
        )
      : baseSku
  return buildVariantSku(templatedBase, options, takenSkus)
}

/**
 * Match a combination against a caller-provided variant override
 * (prices/quantity/sku) using case-insensitive attribute names & values.
 */
export function findOverride(
  overrides: any[] | undefined,
  options: IVariantOptionMap
): Record<string, unknown> | undefined {
  if (!overrides || !overrides.length) return undefined
  const normalize = (obj: Record<string, string>) =>
    Object.keys(obj || {}).reduce<Record<string, string>>((acc, key) => {
      acc[key.trim().toLowerCase()] = String(obj[key]).trim().toLowerCase()
      return acc
    }, {})

  const target = normalize(options)
  return overrides.find((o) => {
    const candidate = normalize(o?.optionValues || o?.options || {})
    const targetKeys = Object.keys(target)
    const candidateKeys = Object.keys(candidate)
    if (targetKeys.length !== candidateKeys.length) return false
    return targetKeys.every((key) => candidate[key] === target[key])
  })
}

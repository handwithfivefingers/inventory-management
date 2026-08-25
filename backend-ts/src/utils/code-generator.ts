import { ICodeEntity, ICodeFormatMap } from '#/types/setting'

/**
 * Pad a sequence number, e.g. padSeq(12) -> '00012'
 */
export const padSeq = (n: number | string, length = 5) =>
  String(n).padStart(length, '0')

/**
 * Apply vendor prefix/suffix configuration to a base code.
 * e.g. applyCodeFormat('00001', 'PO-', '-VN') -> 'PO-00001-VN'
 */
export const applyCodeFormat = (baseCode: string, prefix?: string, suffix?: string) =>
  `${prefix || ''}${baseCode}${suffix || ''}`

/**
 * Read the prefix/suffix configured for a given entity from settings maps.
 */
export const getCodeFormat = (
  codePrefix: ICodeFormatMap | undefined | null,
  codeSuffix: ICodeFormatMap | undefined | null,
  entity: ICodeEntity
): { prefix: string; suffix: string } => ({
  prefix: codePrefix?.[entity] || '',
  suffix: codeSuffix?.[entity] || ''
})

export interface ISkuTemplateParts {
  /** The product base code (already formatted with prefix/suffix if any) */
  CODE?: string
  /** Padded sequence number */
  SEQ?: string
  /** Category name or code */
  CATEGORY?: string
  /** Current year (4 digits) */
  YYYY?: string
}

/**
 * Render an SKU from the vendor's template.
 * Supported tokens: {CODE} {SEQ} {CATEGORY} {YYYY}
 * e.g. template '{PREFIX}-{SEQ}' is not needed here because prefix/suffix
 * are applied separately through applyCodeFormat().
 */
export const generateSkuFromTemplate = (
  template: string | undefined | null,
  parts: ISkuTemplateParts,
  fallbackBase = ''
) => {
  const resolvedTemplate = template && template.trim() ? template : '{CODE}'
  return resolvedTemplate.replace(/\{(CODE|SEQ|CATEGORY|YYYY)\}/g, (_, token) => {
    const value = (parts as Record<string, string | undefined>)[token]
    return value != null ? String(value) : ''
  }) || fallbackBase
}

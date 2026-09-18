import type Product from '#/database/models/product'

/** Product type: 0 = simple, 1 = variant, 2 = combo */
export const PRODUCT_TYPE = { SIMPLE: 0, VARIANT: 1, COMBO: 2 } as const
export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE]

/** Fields the client sends as price strings; "" means "cleared". */
export const PRICE_FIELDS = ['VAT'] as const
export type PriceField = (typeof PRICE_FIELDS)[number]

/** One row of the `variants` array in create/update payloads. */
export type VariantInput = {
  id?: number | string
  variantId?: number | string
  /** Canonical variant SKU field is `skuCode`; `sku` is accepted as an alias (spec). */
  sku?: string
  skuCode?: string
  quantity?: number | string
  attributeValues?: (number | string)[]
  optionValues?: Record<string, string>
  options?: Record<string, string>
  barcodes?: BarcodeInput[]
  VAT?: unknown
  imageUrl?: string | null
  isNegative?: unknown
  isActive?: unknown
}

export type BarcodeInput = {
  id?: number | string
  /** Omit or set to null to have the server assign the next numeric barcode. */
  barcode?: string | null
  unitId?: number | string | null
  conversionRate?: number | string
  costPrice?: number | string
  retailPrice?: number | string
  wholesalePrice?: number | string
  promoPrice?: number | string | null
  promoStartAt?: string | Date | null
  promoEndAt?: string | Date | null
}

export type CreateProductParams = Omit<Product, 'id'> & {
  warehouseId: number
  vendorId: number
  type?: ProductType
  quantity?: number | string
  categories?: number[]
  tags?: number[]
  variants?: VariantInput[]
}

export type UpdateProductParams = {
  id: number
  warehouseId?: number
  type?: ProductType
  name?: string
  skuCode?: string | null
  description?: string | null
  image?: string | null
  unitId?: number | string | null
  unit?: number | string | null
  VAT?: unknown
  isNegative?: unknown
  isActive?: unknown
  categories?: number[]
  tags?: number[]
  quantity?: number | string
  variants?: VariantInput[]
  removedVariantIds?: (number | string)[]
}

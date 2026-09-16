import type Product from '#/database/models/product'

/** Product type: 0 = simple, 1 = variant, 2 = combo */
export const PRODUCT_TYPE = { SIMPLE: 0, VARIANT: 1, COMBO: 2 } as const
export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE]

/** Fields the client sends as price strings; "" means "cleared". */
export const PRICE_FIELDS = ['salePrice', 'regularPrice', 'wholeSalePrice', 'costPrice'] as const
export type PriceField = (typeof PRICE_FIELDS)[number]

/** One row of the `variants` array in create/update payloads. */
export type VariantInput = {
  id?: number | string
  variantId?: number | string
  code?: string | null
  skuCode?: string
  quantity?: number | string
  attributeValues?: (number | string)[]
  optionValues?: Record<string, string>
  options?: Record<string, string>
  salePrice?: unknown
  regularPrice?: unknown
  wholeSalePrice?: unknown
  costPrice?: unknown
  isNegative?: unknown
  isActive?: unknown
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
  code?: string | null
  skuCode?: string | null
  description?: string | null
  image?: string | null
  unitId?: number | string | null
  unit?: number | string | null
  salePrice?: unknown
  regularPrice?: unknown
  wholeSalePrice?: unknown
  costPrice?: unknown
  isNegative?: unknown
  isActive?: unknown
  categories?: number[]
  tags?: number[]
  quantity?: number | string
  variants?: VariantInput[]
  removedVariantIds?: (number | string)[]
}

/**
 * Categories — DTOs and single-purpose helpers (pure data in, no HTTP).
 */

export interface ICategoryCreateInput {
  name: string
  vendorId: number | string
  code?: string
}

export interface ICategoryUpdateInput {
  id: number | string
  name?: string
}

export interface ICategoryListQuery {
  limit?: number
  offset?: number
  vendorId?: number | string
}

/** Validate create input; returns the normalized name/vendorId. */
export const validateCategoryCreateInput = (params: ICategoryCreateInput): { name: string; vendorId: number | string } => {
  if (!params?.name) throw new Error('Category name is required')
  if (!params?.vendorId) throw new Error('Vendor is required')
  return { name: params.name, vendorId: params.vendorId }
}

/** Build the findAndCountAll query for a vendor-scoped category listing. */
export const buildCategoryListQuery = ({ limit, offset, vendorId }: ICategoryListQuery) => {
  if (vendorId == null || String(vendorId).trim() === '') throw new Error('Vendor is required')
  return {
    where: { vendorId },
    offset,
    limit,
    raw: true
  }
}

/** Build the findOne query for a category detail lookup. */
export const buildCategoryDetailQuery = (id: string | number, productModel: unknown) => ({
  where: { id },
  include: productModel
})

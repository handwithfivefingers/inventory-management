interface IPaginationInput {
  page?: number | string
  pageSize?: number | string
  limit?: number | string
  offset?: number | string
  vendorId?: number | string
  warehouseId?: number | string
  [key: string]: unknown
}

export const getPagination = ({ page, pageSize, limit, offset, vendorId, warehouseId }: IPaginationInput) => {
  const resolvedLimit = limit != null && limit !== '' ? +limit : pageSize ? +pageSize : 10
  const resolvedOffset =
    offset != null && offset !== ''
      ? +offset
      : page
        ? Math.max(0, +page - 1) * resolvedLimit
        : 0
  return { limit: resolvedLimit, offset: resolvedOffset, vendorId, warehouseId }
}

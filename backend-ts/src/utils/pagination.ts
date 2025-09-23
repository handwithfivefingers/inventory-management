export const getPagination = ({
  page,
  pageSize,
  vendorId,
  warehouseId
}: {
  page?: number | string
  pageSize?: number | string
  warehouseId?: string
  vendorId?: string
}) => {
  const limit = pageSize ? +pageSize : 10
  const offset = page ? (+page - 1) * limit : 0
  return { limit, offset, vendorId, warehouseId }
}

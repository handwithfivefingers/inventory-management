export const getPagination = ({
  page,
  pageSize,
  vendor,
  warehouse
}: {
  page?: number | string
  pageSize?: number | string
  warehouse?: string
  vendor?: string
}) => {
  const limit = pageSize ? +pageSize : 10
  const offset = page ? ((+page - 1) * limit) : 0
  return { limit, offset, vendor, warehouse }
}

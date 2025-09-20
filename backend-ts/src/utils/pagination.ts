export const getPagination = ({ page, pageSize }: { page?: number | string; pageSize?: number | string }) => {
  const limit = pageSize ? +pageSize : 10
  const offset = page ? +page * limit : 0
  return { limit, offset }
}

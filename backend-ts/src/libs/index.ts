import Redis from '#/configs/redis'
import { IRequestLocal } from '#/types/common'
const { cacheGet, cacheKey } = Redis

export const getCtxUser = async (req: IRequestLocal) => {
  const usr = await cacheGet(cacheKey('User', req.user.email))
  return usr
}

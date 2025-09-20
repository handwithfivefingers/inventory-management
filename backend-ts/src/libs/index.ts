import Redis from '#/configs/redis'
const { cacheGet, cacheKey } = Redis

interface IRequest extends Request {
  locals: Record<any, any>
}

export const getCtxUser = async (req: IRequest) => {
  const usr = await cacheGet(cacheKey('User', req.locals.email))
  return usr
}

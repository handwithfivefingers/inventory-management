// const { decodeToken } = require("@src/libs/token");
// const Sentry = require("@sentry/node");
// const { cacheGet, cacheKey, cacheSet } = require("@src/libs/redis");
// const db = require("@db");
// const { ERROR } = require("@src/constant/message");

import Redis from '#/configs/redis'
import { ERROR } from '#/constant/message'
import database from '#/database'
import { verifyToken } from '#/libs/token'
import { captureException } from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
const { cacheGet, cacheSet, cacheKey } = Redis

interface IRequest extends Request {
  locals: Record<any, any>
}
interface ITokenPayload {
  email: string
  id: number
  iat: number
  exp: number
}
const auth: any = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const cookie = req.cookies
    const session = cookie['session']
    console.log('session', session)
    if (!session) throw new Error(ERROR.UNAUTHORIZED)
    const payload = verifyToken<ITokenPayload>(session)
    if (!payload) throw new Error(ERROR.UNAUTHORIZED)
    const user = await database.user.findOne({ where: { id: payload.id } })
    if (!user) throw new Error(ERROR.UNAUTHORIZED)
    if (payload) {
      req.locals = { email: user.email, id: user.id }
    }
    next()
  } catch (error) {
    captureException(error)
    next(error)
  }
}

export { auth }

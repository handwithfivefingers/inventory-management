// const { AuthenticateService } = require('../../services')
// const { signToken } = require('@libs/token')
// module.exports = class AuthenticateController {
//   async login(req, res, next) {
//     try {
//       const resp = await new AuthenticateService().login(req)
//       const token = await signToken({ id: resp.id, email: resp.email })
//       res.cookie('session', token, {
//         httpOnly: true,
//         maxAge: 3600000 * 24
//       })
//       res.cookie('__authorization', token, {
//         httpOnly: true,
//         maxAge: 3600000 * 24
//       })
//       return res.status(200).json({
//         data: resp,
//         token
//       })
//     } catch (error) {
//       next(error)
//     }
//   }
//   async get(req, res, next) {
//     try {
//       const resp = await new AuthenticateService().get(req)
//       return res.status(200).json({
//         data: resp
//       })
//     } catch (error) {
//       next(error)
//     }
//   }
//   async register(req, res, next) {
//     try {
//       const resp = await new AuthenticateService().register(req.body)
//       return res.status(200).json({
//         data: resp
//       })
//     } catch (error) {
//       next(error)
//     }
//   }
// }

import { signToken } from '#/libs/token'
import AuthenticateService from '#/services/authenticate'
import { Request, Response, NextFunction } from 'express'

interface IRequestLocal extends Request {
  locals: {
    id: number
    email: string
  }
}

interface IResponse<T> {
  data: T
}

interface ILoginResp {
  data: {
    id: number
    email: string
  }
}
export default class AuthenticateController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resp = await new AuthenticateService().login(req)
      if (!resp) throw new Error('User not found')
      const token = await signToken({ id: resp.id, email: resp.email })
      
      // Set session cookie with user, vendor, and warehouse info
      res.cookie('session', token, {
        httpOnly: true,
        maxAge: 3600000 * 24,
        sameSite: 'lax'
      })
      
      res.status(200).json({
        data: {
          ...resp,
          token
        }
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async get(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
    try {
      const resp = await new AuthenticateService().get(req)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resp = await new AuthenticateService().register(req.body)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async logout(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear user cache
      const email = req.locals.email
      if (email) {
        await new AuthenticateService().clearUserCache(email)
      }
      
      res.clearCookie('session')
      res.status(200).json({
        data: {
          message: 'Logout successfully'
        }
      })
      return
    } catch (error) {
      next(error)
    }
  }
}

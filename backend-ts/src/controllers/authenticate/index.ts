import { signToken } from '#/libs/token'
import AuthenticateService from '#/services/authenticate'
import { IRequestLocal } from '#/types/common'
import { Request, Response, NextFunction } from 'express'

export default class AuthenticateController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body
      const resp = await new AuthenticateService().login({ email, password })
      if (!resp) throw new Error('User not found')
      const token = await signToken({ id: resp.id, email: resp.email })

      res.cookie('session', token, {
        httpOnly: true,
        maxAge: 3600000 * 24,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
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
      const id = req.user.id
      const resp = await new AuthenticateService().get(id)
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
      res.status(200).json(resp)
      return
    } catch (error) {
      next(error)
    }
  }
  async logout(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear user cache
      const email = req.user.email
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

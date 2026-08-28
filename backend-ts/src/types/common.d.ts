import { IUserAuthContext } from '#/services/authenticate/userAuth'
import { Request, Response, NextFunction } from 'express'

export type IRequestHandler = [Request, !Response, !NextFunction]

export interface IUserPayload extends IUserAuthContext {
  id: number
  vendorId: number
}

export interface IRequestLocal extends Request {
  user: IUserPayload
}

import { Request, Response, NextFunction } from 'express'

export type IRequestHandler = [Request, !Response, !NextFunction]

export interface IUserPayload {
  id: number
  email: string
  vendorId?: number | null
}

export interface IRequestLocal extends Request {
  locals: {
    id: string
    email: string
  }
  user?: IUserPayload
}

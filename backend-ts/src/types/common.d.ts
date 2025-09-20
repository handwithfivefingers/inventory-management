import { Request, Response, NextFunction } from 'express'

export type IRequestHandler = [Request, !Response, !NextFunction]
export interface IRequestLocal extends Request {
  locals: {
    id: number
    email: string
  }
}
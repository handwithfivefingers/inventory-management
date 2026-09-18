import { IUserAuthContext } from '#/services/authenticate/userAuth'
import { Request, Response, NextFunction } from 'express'

export type IRequestHandler = [IRequestLocal, !Response, !NextFunction]

export interface IUserPayload extends IUserAuthContext {
  id: number
  vendorId: number | null
}

export interface IRequestTenant {
  /** null means a platform account with unrestricted vendor scope. */
  scope: number[] | null
  /** Validated workspace vendor selected by the request. */
  vendorId: number | null
}

export type IRequestLocal = Request & {
  user: IUserPayload
  tenant: IRequestTenant
  activeVendorId?: number
}

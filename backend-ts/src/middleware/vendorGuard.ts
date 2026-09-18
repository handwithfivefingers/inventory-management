import { IRequestLocal } from '#/types/common'
import { getRequestedVendorId } from '#/utils/tenant'
import { NextFunction, Request, Response } from 'express'
import { captureException } from '@sentry/node'
import { ApiError } from '#/response'

const resolveRequestedVendorId = (req: IRequestLocal): string | number | undefined => {
  // Tenant identity is carried by the `x-vendor` header (see `utils/tenant.ts`).
  return getRequestedVendorId(req)
}

const vendorGuard = (request: Request, _res: Response, next: NextFunction): void => {
  const req = request as IRequestLocal
  try {
    const scope = req.tenant?.scope

    // `vendorGuard` must run after `auth`; never treat a missing context as
    // unrestricted because that would turn a middleware-ordering bug into a
    // tenant isolation vulnerability.
    if (!scope) {
      throw ApiError.unauthorized('Tenant context is missing')
    }

    // Empty scope = authenticated but owns nothing -> deny all
    if (scope.length === 0) {
      throw ApiError.forbidden(`Forbidden Resource`)
    }
    const raw = resolveRequestedVendorId(req)
    const vendorId = Number(raw)
    if (!Number.isFinite(vendorId) || !scope.includes(vendorId)) {
      throw ApiError.forbidden(`Forbidden Resource`)
    }
    req.activeVendorId = vendorId
    req.tenant.vendorId = vendorId
    return next()
  } catch (error) {
    captureException(error)
    return next(error)
  }
}

export { vendorGuard }

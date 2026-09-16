import { IRequestLocal } from '#/types/common'
import { getRequestedVendorId, getVendorScope } from '#/utils/tenant'
import { NextFunction, Response } from 'express'
import { captureException } from '@sentry/node'
import { ApiError } from '#/response'

const resolveRequestedVendorId = (req: IRequestLocal): string | number | undefined => {
  // Tenant identity is carried by the `x-vendor` header (see `utils/tenant.ts`).
  // Query/body `vendorId`/`vendor` remain as legacy fallbacks; header wins.
  return getRequestedVendorId(req)
}

const vendorGuard: any = async (req: IRequestLocal, res: Response, next: NextFunction) => {
  try {
    const scope = getVendorScope(req)
    // Platform admin (null scope) is unrestricted
    if (scope === null) {
      console.log(`('---------- Vendor Guard Middleware next (platform admin)`)
      return next()
    }
    // Empty scope = authenticated but owns nothing -> deny all
    if (scope.length === 0) {
      throw ApiError.forbidden(`Vendor not found`)
    }
    const raw = resolveRequestedVendorId(req)
    const vendorId = Number(raw)
    if (!Number.isFinite(vendorId) || !scope.includes(vendorId)) {
      throw ApiError.forbidden(`Vendor not found`)
    }
    // Expose the validated active vendor for downstream controllers/services
    // so they don't need to re-parse headers/query.
    ;(req as unknown as Record<string, unknown>).activeVendorId = vendorId
    next()
  } catch (error) {
    console.log('---------- Vendor Guard Middleware catched')
    ;(error as Error & { status?: number }).status = 401
    captureException(error)
    next(error)
  }
}

export { vendorGuard }

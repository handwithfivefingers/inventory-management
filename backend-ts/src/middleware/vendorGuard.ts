import { IRequestLocal } from '#/types/common'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Response } from 'express'
import { captureException } from '@sentry/node'
import { ApiError } from '#/response'

const resolveRequestedVendorId = (req: IRequestLocal): string | number | undefined => {
  // const q: any = req.query || {}
  // const b: any = req.body || {}
  // return q.vendorId ?? q.vendor ?? b.vendorId ?? b.vendor
  let raw = (req.headers?.['x-vendor'] as string) || undefined
  return raw
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
    next()
  } catch (error) {
    console.log('---------- Vendor Guard Middleware catched')
    ;(error as Error & { status?: number }).status = 401
    captureException(error)
    next(error)
  }
}

export { vendorGuard }

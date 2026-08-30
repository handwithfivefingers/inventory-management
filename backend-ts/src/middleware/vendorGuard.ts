import { IRequestLocal } from '#/types/common'
import { getVendorScope } from '#/utils/tenant'
import { NextFunction, Response } from 'express'

const resolveRequestedVendorId = (req: IRequestLocal): string | number | undefined => {
  const q: any = req.query || {}
  const b: any = req.body || {}
  return q.vendorId ?? q.vendor ?? b.vendorId ?? b.vendor
}

const vendorGuard: any = async (req: IRequestLocal, res: Response, next: NextFunction) => {
  const scope = getVendorScope(req)
  // Platform admin (null scope) is unrestricted
  if (scope === null) {
    console.log(`('---------- Vendor Guard Middleware next (platform admin)`)
    return next()
  }
  // Empty scope = authenticated but owns nothing -> deny all
  if (scope.length === 0) {
    console.log('---------- Vendor Guard Middleware catched (empty scope)')
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const raw = resolveRequestedVendorId(req)
  const vendorId = Number(raw)
  if (!Number.isFinite(vendorId) || !scope.includes(vendorId)) {
    console.log('---------- Vendor Guard Middleware catched')
    return res.status(401).json({ message: 'Unauthorized' })
  }
  console.log(`('---------- Vendor Guard Middleware next`)
  next()
}

export { vendorGuard }

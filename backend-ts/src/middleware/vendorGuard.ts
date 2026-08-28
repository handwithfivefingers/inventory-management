import { IRequestLocal } from '#/types/common'
import { NextFunction, Response } from 'express'

const vendorGuard: any = async (req: IRequestLocal, res: Response, next: NextFunction) => {
  const allowedVendorIds = req.user.vendorIds
  const { vendorId } = req.query
  if (!Number.isFinite(Number(vendorId)) || !allowedVendorIds.includes(Number(vendorId))) {
    console.log('---------- Vendor Guard Middleware catched')
    return res.status(401).json({ message: 'Unauthorized' })
  }
  console.log(`('---------- Vendor Guard Middleware next`)
  next()
}

export { vendorGuard }

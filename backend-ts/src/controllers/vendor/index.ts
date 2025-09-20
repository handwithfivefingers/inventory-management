import VendorService from '#/services/vendor'
import { IRequestHandler } from '#/types/common'

// const { VendorService } = require('@api/services')
export default class VendorController {
  async create(...[req, res, next]: IRequestHandler) {
    try {
      const resp = await new VendorService().create(req)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  // async get(...[req, res, next]: IRequestHandler) {
  //   try {
  //     const { count, rows } = await new VendorService().getVendors()
  //     res.status(200).json({ total: count, data: rows })
  //     return
  //   } catch (error) {
  //     next(error)
  //   }
  // }
}

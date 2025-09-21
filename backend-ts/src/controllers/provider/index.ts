import { ProviderService } from '#/services/provider'
import { IRequestHandler, IRequestLocal } from '#/types/common'
export class ProviderController {
  async create(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new ProviderService().create(req as IRequestLocal)
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  async getProvider(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const { count, rows } = await new ProviderService().getProvider(req as IRequestLocal)
      res.status(200).json({ total: count, data: rows })
      return
    } catch (error) {
      console.log('getProvider error', error)
      next(error)
    }
  }
  async getId(...arg: IRequestHandler) {
    const [req, res, next] = arg
    try {
      const resp = await new ProviderService().getProviderById({ id: req.params.id })
      res.status(200).json({
        data: resp
      })
      return
    } catch (error) {
      next(error)
    }
  }
  // async update(...arg: IRequestHandler) {
  //   const [req, res, next] = arg
  //   try {
  //     const resp = await new ProviderService().update(req as IRequestLocal)
  //     return res.status(200).json({
  //       data: resp
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }
}

import database from '#/database'
import { ITransferStatic } from '#/types/transfer'
import { Sequelize } from 'sequelize'
import { Request } from 'express'
// const BaseCRUDService = require('@constant/base')
// const { Op } = require('sequelize')
interface IRequestLocal extends Request {
  locals: {
    id: number
    email: string
  }
}
interface ICreateParams {
  warehouseId: number
  productId: number
  quantity: number
  type: string
}
export class TransferService {
  sequelize: Sequelize = database.sequelize
  transfer: ITransferStatic = database.transfer
  Op = database.Sequelize.Op

  // async create(params: ICreateParams, options?: any) {
  //   const t = await this.sequelize.transaction()
  //   try {
  //     const transferBuilder = this.transfer.build(params)
  //     const newTransfer = await transferBuilder.save({ transaction: t })
  //     await t.commit()
  //     return {
  //       transfer: newTransfer
  //     }
  //   } catch (error) {
  //     await t.rollback()
  //     throw error
  //   }
  // }
  async getHistoryByProductId(req: IRequestLocal) {
    try {
      const { id } = req.params
      // const resp = await this.get({
      //   where: {
      //     productId: id,
      //     warehouseId: {
      //       [this.Op.in]: req.locals.user.warehouses.map((item) => item.id)
      //     }
      //   }
      // })
      const resp = await this.transfer.findAndCountAll({
        where: {
          productId: id,
          warehouseId: {
            // [this.Op.in]: req.locals.warehouses.map((item) => item.id)
          }
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async create(params: ICreateParams, options?: any) {
    const transferBuilder = this.transfer.build(params)
    const trans = await transferBuilder.save(options)
    return trans
  }
}

import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ITransferStatic } from '#/types/transfer'
import { Op, Sequelize } from 'sequelize'
// const BaseCRUDService = require('@constant/base')
// const { Op } = require('sequelize')

interface ICreateParams {
  warehouseId: number
  productId: number
  quantity: number
  type: string
}
export class TransferService {
  sequelize: Sequelize = database.sequelize
  transfer: ITransferStatic = database.transfer
  async getHistoryByProductId({ id, warehouseId }: { id: string; warehouseId: string | string[] }) {
    try {
      const warehouseQuery = typeof warehouseId === 'string' ? [warehouseId] : warehouseId
      const resp = await this.transfer.findAndCountAll({
        where: {
          productId: id,
          warehouseId: {
            [Op.in]: warehouseQuery
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

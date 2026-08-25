import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ITransferStatic } from '#/types/transfer'
import { Op, Sequelize } from 'sequelize'
// const BaseCRUDService = require('@constant/base')
// const { Op } = require('sequelize')

interface ICreateParams {
  warehouseId: number
  productId: number
  /** Optional: set for variant-level movements, NULL/undefined = product level */
  variantId?: number | null
  quantity: number
  type: string
}
export class TransferService {
  sequelize: Sequelize = database.sequelize
  transfer: ITransferStatic = database.transfer
  async getHistoryByProductId({
    id,
    warehouseId,
    variantId
  }: {
    id: string
    warehouseId: string | string[]
    variantId?: string | number | null
  }) {
    try {
      const warehouseQuery = typeof warehouseId === 'string' ? [warehouseId] : warehouseId
      const where: Record<string, unknown> = {
        productId: id,
        warehouseId: {
          [Op.in]: warehouseQuery
        }
      }
      // Filter by a specific variant; omit the key entirely to keep the
      // legacy behaviour of returning all movements for the product.
      if (variantId != null && variantId !== '') {
        where.variantId = Number(variantId)
      }
      const resp = await this.transfer.findAndCountAll({
        where,
        include: [
          {
            model: database.productVariant,
            attributes: ['id', 'skuCode'],
            required: false
          }
        ] as any
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

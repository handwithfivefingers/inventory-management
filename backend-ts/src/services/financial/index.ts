import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ITransferStatic } from '#/types/transfer'
import { getPagination } from '#/utils'
import { FindAttributeOptions, Sequelize } from 'sequelize'

export class FinancialService {
  transfer: ITransferStatic = database.transfer
  sequelize: Sequelize = database.sequelize
  async getFinancial(req: IRequestLocal) {
    try {
      const { offset, limit } = getPagination(req.query)
      const queryParams = {
        where: {
          warehouseId: req.query.warehouse
        },
        offset,
        limit,
        include: [
          {
            model: database.product,
            required: false
          }
        ],
        attributes: [
          'updatedAt',
          'type',
          [this.sequelize.literal('SUM(product.regularPrice * transfer.quantity)'), 'totalPrice']
        ] as FindAttributeOptions,
        group: ['updatedAt', 'type'],
        raw: true
      }
      const resp = await this.transfer.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      console.log('error', error)
      throw error
    }
  }
}

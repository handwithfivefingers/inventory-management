import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IWarehouseModel, IWarehouseStatic } from '#/types/warehouse'
import { getPagination } from '#/utils'
import { Optional, Sequelize } from 'sequelize'

// const BaseCRUDService = require('@constant/base')
// const redisClient = require('@src/config/redis')
// const { cacheGet, cacheKey, cacheSet } = require('@src/libs/redis')
// const { retrieveUser } = require('@src/libs/utils')

export class WarehouseService {
  warehouse: IWarehouseStatic = database.warehouse
  sequelize: Sequelize = database.sequelize
  async create({ name, isMain, email, address, phone, vendorId }: Optional<IWarehouseModel, 'id'>) {
    const t = await this.sequelize.transaction()
    try {
      // const p = await this.createInstance(
      //   {
      //     name,
      //     name,
      //     isMain,
      //     email,
      //     address,
      //     phone,
      //     vendorId
      //   },
      //   {
      //     transaction: t
      //   }
      // )
      const builder = this.warehouse.build({
        name,
        isMain,
        email,
        address,
        phone,
        vendorId
      })
      const p = await builder.save({ transaction: t })

      await t.commit()
      return {
        warehouse: p
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  async getWarehouse(req: IRequestLocal) {
    try {
      // const { vendor, warehouse } = this.getActiveWarehouseAndVendor(req)
      const { offset, limit } = getPagination(req.query)
      const resp = await this.warehouse.findAndCountAll({
        where: {
          // vendorId: vendor.id
        },
        include: [
          {
            model: database.inventory,
            attributes: []
          }
        ],
        attributes: {
          include: [[this.sequelize.fn('sum', this.sequelize.col('inventories.quantity')), 'quantity']]
        },
        offset,
        limit,
        subQuery: false, // Unknown column "inventories.quantity" in field list
        distinct: true
      })
      console.log('resp', resp.rows[0])
      return resp
    } catch (error) {
      throw error
    }
  }
  async getWarehouseById({ params, query }: any) {
    try {
      const resp = await this.warehouse.findOne({
        where: {
          id: params.id,
          vendorId: query.vendor
        },
        include: { model: database.inventory, attributes: [] },
        attributes: {
          include: [[this.sequelize.col('inventories.quantity'), 'quantity']]
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

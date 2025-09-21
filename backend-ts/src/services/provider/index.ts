import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { IProviderStatic } from '#/types/provider'
import { Sequelize } from 'sequelize'

// const BaseCRUDService = require('@constant/base')
// const { providerCacheItem } = require('./cache')
// const { cacheKey, cacheSet } = require('@src/libs/redis')
// const { retrieveFirstVendor } = require('@src/libs/utils')
export class ProviderService {
  provider: IProviderStatic = database.provider
  sequelize: Sequelize = database.sequelize
  async create(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      // const { ...params } = req.body
      // const vendor = retrieveFirstVendor(req)
      // const p = await this.createInstance(
      //   { ...params, vendorId: vendor.id },
      //   {
      //     transaction: t
      //   }
      // )
      const warehouseBuilder = this.provider.build(req.body)
      const warehouse = await warehouseBuilder.save({ transaction: t })
      await t.commit()
      return {
        warehouse: warehouse.dataValues
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  // async update(req) {
  //   const t = await this.sequelize.transaction()
  //   try {
  //     const vendor = retrieveFirstVendor(req)
  //     const entry = await this.provider.findByPk(req.params.id)
  //     const exclude = ['id', 'vendorId', 'createdAt', 'updatedAt']
  //     for (let key in req.body) {
  //       if (exclude.includes(key)) continue
  //       entry[key] = req.body[key]
  //     }
  //     await entry.save({ transaction: t })
  //     await t.commit()
  //     await cacheSet(cacheKey('Provider', req.params.id, vendor.id), entry)
  //     return entry
  //   } catch (error) {
  //     await t.rollback()
  //     throw error
  //   }
  // }
  async getProvider(req: IRequestLocal) {
    try {
      const { vendor } = req.params
      // const { vendor } = this.getActiveWarehouseAndVendor(req)
      // const { limit, offset } = this.getPagination(req)
      const { limit = 10, offset = 0 } = req.query
      const queryParams = {
        where: {},
        limit: Number(limit),
        offset: Number(offset),
        distinct: true
      }
      if (vendor) queryParams.where = { ...queryParams.where, vendorId: vendor }
      const resp = await this.provider.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw error
    }
  }
  async getProviderById({ id }: { id: string }) {
    try {
      // const vendor = retrieveFirstVendor(req)
      const resp = await this.provider.findOne({
        where: {
          id
          // vendorId: vendor.id
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

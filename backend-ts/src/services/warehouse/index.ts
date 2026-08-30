import database from '#/database'
import Inventory from '#/database/models/inventory'
import Warehouse from '#/database/models/warehouse'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { IWarehouseModel, IWarehouseStatic } from '#/types/warehouse'
import { getPagination } from '#/utils'
import { FindAttributeOptions, Optional, Sequelize } from 'sequelize'

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
      if (isMain === true && vendorId) {
        await this.warehouse.update(
          { isMain: false },
          { where: { vendorId, isMain: true }, transaction: t }
        )
      }
      const builder = this.warehouse.build({
        name,
        isMain: !!isMain,
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
  async getWarehouse({ offset, limit, vendorId }: { offset?: number; limit?: number; vendorId?: string }) {
    try {
      const queryParams = {
        where: {},
        attributes: {
          include: [
            [
              this.sequelize.literal(`
                (SELECT SUM(quantity) 
                FROM inventories
                WHERE inventories.warehouseId = warehouse.id)`),
              'quantity'
            ]
          ]
        } as FindAttributeOptions,
        offset,
        limit,
        distinct: true,
        logger: console.log
      }
      if (vendorId) queryParams.where = { ...queryParams.where, vendorId: vendorId }
      const { rows, count } = await Warehouse.findAndCountAll(queryParams)
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error)
    }
  }
  async getWarehouseById({ id, vendorId }: Partial<IWarehouseModel>) {
    try {
      const resp = await this.warehouse.findOne({
        where: {
          id,
          vendorId
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

  async update({
    id,
    vendorId,
    name,
    email,
    address,
    phone,
    isMain
  }: Partial<IWarehouseModel> & { id: number | string }) {
    const t = await this.sequelize.transaction()
    try {
      const warehouse = await this.warehouse.findOne({
        where: { id, vendorId },
        transaction: t
      })
      if (!warehouse) throw ApiError.from({ message: 'Warehouse not found', status: 404 } as any)

      // Enforce single main warehouse per vendor
      if (isMain === true) {
        await this.warehouse.update(
          { isMain: false },
          { where: { vendorId, isMain: true }, transaction: t }
        )
      }

      const updatable: Partial<IWarehouseModel> = {}
      if (name !== undefined) (updatable as any).name = name
      if (email !== undefined) (updatable as any).email = email
      if (address !== undefined) (updatable as any).address = address
      if (phone !== undefined) (updatable as any).phone = phone
      if (isMain !== undefined) (updatable as any).isMain = isMain

      await warehouse.update(updatable, { transaction: t })
      await t.commit()
      return warehouse
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error)
    }
  }
}

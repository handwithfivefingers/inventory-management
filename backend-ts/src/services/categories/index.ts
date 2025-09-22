/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import { ICategoryModel, ICategoryStatic } from '#/types/category'
import { IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { Optional, Sequelize } from 'sequelize'

export class CategoriesService {
  category: ICategoryStatic = database.category
  sequelize: Sequelize = database.sequelize
  async create(params: Optional<ICategoryModel, 'id'>) {
    try {
      if (!params.name) throw new Error('Category name is required')
      if (!params.vendorId) throw new Error('Vendor is required')
      const builder = this.category.build(params)
      const instance = await builder.save()
      return instance
    } catch (error) {
      throw error
    }
  }

  async update(params: Optional<ICategoryModel, 'id'>) {
    try {
      const instance = await this.category.update(
        {
          name: params.name
        },
        {
          where: {
            id: params.id
          }
        }
      )
      return instance
    } catch (error) {
      throw error
    }
  }

  async getCategories(req: IRequestLocal) {
    try {
      const { offset, limit, vendor } = getPagination(req.query)
      console.log('offset, limit, ', offset, limit)
      if (!vendor) throw new Error('Vendor is required')
      const queryParams = {
        where: {
          vendorId: vendor
        },
        offset,
        limit,
        raw: true
      }
      const resp = await this.category.findAndCountAll(queryParams)
      console.log('resp', resp)
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById(id: string | number) {
    try {
      const resp = await this.category.findOne({
        where: {
          id: id
        },
        include: database.product
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async deleteById(id: string | number) {
    const t = await this.sequelize.transaction()
    try {
      // const { vendor } = this.getActiveWarehouseAndVendor(req)
      const resp = await this.category.destroy({ where: { id: id } })
      // const resp = await this.delete({ where: { id: id, vendorId: vendor.id } }, { transaction: t })
      await t.commit()
      return resp
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}

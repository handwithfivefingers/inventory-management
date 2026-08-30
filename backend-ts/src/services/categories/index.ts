/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import { ICategoryModel, ICategoryStatic } from '#/types/category'
import { applyCodeFormat, getCodeFormat, padSeq } from '#/utils/code-generator'
import { Optional, Sequelize } from 'sequelize'
import { SettingService } from '../setting'
import Category from '#/database/models/category'

export class CategoriesService {
  // category: ICategoryStatic = database.category
  sequelize: Sequelize = database.sequelize
  async create(params: Optional<Category, 'id'>) {
    try {
      if (!params.name) throw new Error('Category name is required')
      if (!params.vendorId) throw new Error('Vendor is required')

      // Auto-generate the category code from the vendor prefix/suffix settings
      let code = params.code
      try {
        const settings = await new SettingService().getForVendor(params.vendorId)

        const seq: number = await Category.count({
          where: { vendorId: Number(params.vendorId) }
        })

        const baseCode = code || padSeq(seq + 1)
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'category')
        code = applyCodeFormat(baseCode, prefix, suffix)
      } catch (e) {
        console.warn('category code generation skipped', e)
      }

      const builder = Category.build({ ...params, code })
      const instance = await builder.save()
      return instance
    } catch (error) {
      throw error
    }
  }

  async update(params: Optional<Category, 'id'>) {
    try {
      const instance = await Category.update(
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

  async getCategories({ limit, offset, vendorId }: { limit?: number; offset?: number; vendorId?: string }) {
    try {
      const queryParams = {
        where: {
          vendorId
        },
        offset,
        limit
      }
      const resp = await Category.findAndCountAll(queryParams)
      console.log('resp', resp)
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById(id: string | number) {
    try {
      const resp = await Category.findByPk(id, {
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
      const resp = await Category.destroy({ where: { id: id } })
      // const resp = await this.delete({ where: { id: id, vendorId: vendor.id } }, { transaction: t })
      await t.commit()
      return resp
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}

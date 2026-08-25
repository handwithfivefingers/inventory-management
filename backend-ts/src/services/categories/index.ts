/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import { ICategoryModel, ICategoryStatic } from '#/types/category'
import { IRequestLocal } from '#/types/common'
import { SettingService } from '../setting'
import { applyCodeFormat, getCodeFormat, padSeq } from '#/utils/code-generator'
import { getPagination } from '#/utils'
import { Optional, Sequelize } from 'sequelize'

export class CategoriesService {
  category: ICategoryStatic = database.category
  sequelize: Sequelize = database.sequelize
  async create(params: Optional<ICategoryModel, 'id'>, vendorId?: number | string | null) {
    try {
      if (!params.name) throw new Error('Category name is required')
      if (!params.vendorId && !vendorId) throw new Error('Vendor is required')

      // Auto-generate the category code from the vendor prefix/suffix settings
      let code = (params as any).code
      const finalVendorId = params.vendorId || vendorId
      try {
        const settings = await new SettingService().getForVendor(finalVendorId)
        const seq: number = (await this.category.count({
          where: { vendorId: Number(finalVendorId) }
        } as any)) as unknown as number
        const baseCode = code || padSeq(seq + 1)
        const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'category')
        code = applyCodeFormat(baseCode, prefix, suffix)
      } catch (e) {
        console.warn('category code generation skipped', e)
      }

      const builder = this.category.build({ ...params, code })
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

  async getCategories({ limit, offset, vendorId }: { limit?: number; offset?: number; vendorId?: string }) {
    try {
      console.log('offset, limit, ', offset, limit)
      if (!vendorId) throw new Error('Vendor is required')
      const queryParams = {
        where: {
          vendorId
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

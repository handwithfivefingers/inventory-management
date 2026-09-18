/**
 * Categories service — thin orchestration over DTO helpers.
 *
 * All public methods accept plain data (DTOs/ids), never HTTP `req` objects.
 * HTTP parsing lives in the controller layer.
 */

import database from '#/database'
import { ICategoryModel } from '#/types/category'
import { applyCodeFormat, getCodeFormat, padSeq } from '#/utils/code-generator'
import { Optional, Sequelize } from 'sequelize'
import { SettingService } from '../setting'
import { ICategoryCreateInput, ICategoryListQuery, ICategoryUpdateInput, validateCategoryCreateInput } from './types'
import Category from '#/database/models/category'
import { ApiError } from '#/response'

export class CategoriesService {
  sequelize: Sequelize = database.sequelize

  /** Best-effort code generation from vendor prefix/suffix settings; falls back to the input code. */
  private async generateCategoryCode(vendorId: number | string, inputCode?: string): Promise<string | undefined> {
    try {
      const settings = await new SettingService().getForVendor(vendorId)
      const seq: number = await database.category.count({
        where: { vendorId: Number(vendorId) }
      })
      if (!Number.isFinite(seq)) return inputCode
      const baseCode = inputCode || padSeq(seq + 1)
      const { prefix, suffix } = getCodeFormat(settings.codePrefix, settings.codeSuffix, 'category')
      return applyCodeFormat(baseCode, prefix, suffix)
    } catch (e) {
      console.warn('category code generation skipped', e)
      return inputCode
    }
  }

  /** Persist a new category row and return the instance. */
  private async saveCategory(params: Record<string, unknown>) {
    const builder = database.category.build(params as any)
    return await builder.save()
  }

  async create(params: ICategoryCreateInput & Optional<ICategoryModel, 'id'>) {
    try {
      const { name, vendorId } = validateCategoryCreateInput(params)
      const code = await this.generateCategoryCode(vendorId, (params as ICategoryCreateInput).code)
      const payload: Record<string, unknown> = { ...params, name, vendorId }
      if (code !== undefined) payload.code = code
      return await this.saveCategory(payload)
    } catch (error) {
      throw error
    }
  }

  async update(params: ICategoryUpdateInput, vendorId: number) {
    try {
      const instance = await database.category.update(
        {
          name: (params as ICategoryUpdateInput).name
        },
        {
          where: {
            id: (params as ICategoryUpdateInput).id,
            vendorId
          }
        }
      )
      return instance
    } catch (error) {
      throw error
    }
  }

  async getCategories({ limit, offset, vendorId }: ICategoryListQuery) {
    try {
      const resp = await Category.findAndCountAll({
        where: { vendorId },
        offset,
        limit,
        raw: true
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById(id: string | number, vendorId: number) {
    try {
      const resp = await Category.findOne({
        where: { id, vendorId }
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async deleteById(id: string | number, vendorId: number) {
    const _cate = await Category.findByPk(id)
    if (!_cate) throw ApiError.notFound('Unit not found')
    if (_cate.vendorId !== vendorId) throw ApiError.notFound('Unit not found')
    await _cate.destroy()
    return true
  }
}

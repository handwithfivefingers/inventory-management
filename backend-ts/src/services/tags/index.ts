/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import Product from '#/database/models/product'
import Tag from '#/database/models/tag'
import { ApiError } from '#/response'
import { ITagModel, ITagStatic } from '#/types/tag'
import { Optional } from 'sequelize'

export class TagsService {
  tag: ITagStatic = database.tag
  async create(params: Optional<ITagModel, 'id'>) {
    try {
      const instance = await this.tag.create(params)
      return instance
    } catch (error) {
      throw error
    }
  }
  async update({ id, vendorId, ...params }: ITagModel) {
    try {
      const resp = await this.tag.update(params, { where: { id: id, vendorId } })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getTags({ vendorId }: { vendorId: string }) {
    try {
      const resp = await this.tag.findAndCountAll({
        where: {
          vendorId
        },
        order: [['id', 'desc']]
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById({ id, vendorId }: { id: string; vendorId: string }) {
    try {
      const resp = await Tag.findOne({
        where: {
          id,
          vendorId
        },
        include: Product
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async delete(id: string | number, vendorId: number) {
    const _tag = await Tag.findByPk(id)
    if (!_tag) throw ApiError.notFound('Unit not found')
    if (_tag.vendorId !== vendorId) throw ApiError.notFound('Unit not found')
    await _tag.destroy()
    return true
  }
}

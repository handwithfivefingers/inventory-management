/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
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
  async update({ id, ...params }: ITagModel) {
    try {
      const resp = await this.tag.update(params, { where: { id: id } })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getTags({ vendorId }: { vendorId: string }) {
    try {
      const queryParams = {
        where: {
          vendorId
        }
      }
      const resp = await this.tag.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById({ id, vendorId }: { id: string; vendorId: string }) {
    try {
      const resp = await this.tag.findOne({
        where: {
          id,
          vendorId
        },
        include: database.product
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

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
      const builder = this.tag.build(params)
      const instance = await builder.save()
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
          vendorId: vendorId
        }
      }
      const resp = await this.tag.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById({ id }: { id: string }) {
    try {
      const resp = await this.tag.findOne({
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
}

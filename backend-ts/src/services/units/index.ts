/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import { IUnitModel, IUnitStatic } from '#/types/unit'
import { Optional } from 'sequelize'

export class UnitsService {
  unit: IUnitStatic = database.unit
  async create(params: Optional<IUnitModel, 'id'>) {
    try {
      const builder = this.unit.build(params)
      const instance = await builder.save()
      return instance
    } catch (error) {
      throw error
    }
  }
  async update({ id, ...params }: IUnitModel) {
    try {
      const resp = await this.unit.update(params, { where: { id: id } })
      return resp
    } catch (error) {
      throw error
    }
  }

  async getUnits(vendorId: string) {
    try {
      const queryParams = {
        where: {
          vendorId: vendorId
        }
      }
      const resp = await this.unit.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw error
    }
  }

  async getById(id: string) {
    try {
      const resp = await this.unit.findOne({
        where: {
          id: id
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

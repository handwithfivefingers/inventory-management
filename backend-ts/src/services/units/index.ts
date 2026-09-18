/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import database from '#/database'
import { ApiError } from '#/response'
import { IUnitModel, IUnitStatic } from '#/types/unit'
import { Optional } from 'sequelize'

export class UnitsService {
  unit: IUnitStatic = database.unit
  async create(params: Optional<IUnitModel, 'id'>) {
    try {
      const _unit = await this.unit.create(params)
      return _unit
    } catch (error) {
      throw ApiError.from(error)
    }
  }
  async update({ id, ...params }: IUnitModel) {
    try {
      const resp = await this.unit.update(params, { where: { id: id } })
      return resp
    } catch (error) {
      throw ApiError.from(error)
    }
  }

  async getUnits(vendorId: string) {
    try {
      // Retrieve all units
      const queryParams = {
        where: {
          vendorId
        }
      }
      const resp = await this.unit.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw ApiError.from(error)
    }
  }

  async getById({ id, vendorId }: { id: string; vendorId: string }) {
    try {
      const resp = await this.unit.findOne({
        where: {
          id,
          vendorId
        }
      })
      return resp
    } catch (error) {
      throw ApiError.from(error)
    }
  }
}

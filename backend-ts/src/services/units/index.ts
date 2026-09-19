/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

import Unit from '#/database/models/units'
import { ApiError } from '#/response'
import { IUnitModel } from '#/types/unit'
import { Op, Optional } from 'sequelize'

export class UnitsService {
  async create(params: Optional<IUnitModel, 'id'>) {
    try {
      const { name, vendorId } = params
      const _unit = await Unit.create({ name, vendorId, isDefault: false })
      return _unit
    } catch (error) {
      throw ApiError.from(error)
    }
  }
  async update({ id, vendorId, ...params }: Unit) {
    try {
      const _unit = await Unit.findOne({ where: { id, vendorId } })

      if (!_unit) throw ApiError.notFound('Unit not found')

      const body: Partial<Unit> = {}

      if (params.name) body.name = params.name

      await _unit.update(body)

      return true
    } catch (error) {
      throw ApiError.from(error)
    }
  }

  async getUnits(vendorId: string) {
    try {
      const resp = await Unit.findAndCountAll({
        where: {
          [Op.or]: [{ vendorId }, { vendorId: null }]
        },
        distinct: true,
        order: [['id', 'DESC']]
      })
      return resp
    } catch (error) {
      throw ApiError.from(error)
    }
  }

  async getById({ id, vendorId }: { id: string; vendorId: string }) {
    try {
      const resp = await Unit.findOne({
        where: {
          id,
          [Op.or]: [{ vendorId }, { vendorId: null }]
        }
      })
      return resp
    } catch (error) {
      throw ApiError.from(error)
    }
  }

  async delete(id: number, vendorId: number) {
    const _unit = await Unit.findOne({ where: { id, vendorId } })
    if (!_unit) throw ApiError.notFound('Unit not found')
    if (_unit.isDefault) throw ApiError.conflict('The default unit cannot be deleted')
    await _unit.destroy()
    return true
  }
}

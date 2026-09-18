import database from '#/database'
import Provider from '#/database/models/provider'
import { ApiError } from '#/response'
import { IProviderStatic } from '#/types/provider'
import { Sequelize } from 'sequelize'

export class ProviderService {
  provider: IProviderStatic = database.provider
  sequelize: Sequelize = database.sequelize
  async create(body: Partial<Provider>) {
    try {
      const _provider = await Provider.create(body)
      return _provider.dataValues
    } catch (error) {
      throw error
    }
  }
  async update(id: number, body: Partial<Provider>) {
    try {
      const entry = await Provider.findByPk(id)
      if (!entry) throw new Error('Provider not found')
      await entry.update(body)
      return entry
    } catch (error) {
      throw ApiError.from(error)
    }
  }
  async getProvider({ offset, limit, vendorId }: { offset?: number; limit?: number; vendorId: number }) {
    try {
      const queryParams = {
        where: {
          vendorId
        },
        limit: Number(limit),
        offset: Number(offset),
        distinct: true
      }
      const resp = await Provider.findAndCountAll(queryParams)
      return resp
    } catch (error) {
      throw error
    }
  }
  async getProviderById({ id, vendorId }: { id: string; vendorId: number }) {
    try {
      const resp = await Provider.findOne({
        where: {
          id,
          vendorId
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

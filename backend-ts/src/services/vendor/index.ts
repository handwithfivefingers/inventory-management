import { ERROR } from '#/constant/message'
import database from '#/database'
import { getCtxUser } from '#/libs'
import { invalidateUserAuthCache } from '#/services/authenticate/userAuth'
import { invalidateUserAuthCache } from '#/services/authenticate/userAuth'
import { IVendorStatic } from '#/types/vendor'
import { Request } from 'express'
import { Sequelize } from 'sequelize'

export default class VendorService {
  vendor: IVendorStatic = database.vendor
  sequelize: Sequelize = database.sequelize
  async create(req: Request) {
    const { name, description, userId } = req.body
    const t = await this.sequelize.transaction()
    try {
      const user = await getCtxUser(req as any)
      if (!user) throw new Error(ERROR.UNAUTHORIZED)
      const _vendor = await this.vendor.create(
        {
          name,
          userId: user.id
        },
        {
          transaction: t
        }
      )

      await t.commit()
      try {
        await invalidateUserAuthCache(Number(user.id))
      } catch {}
      return {
        vendor: _vendor
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  async getVendorByUserId(userId: string) {
    try {
      const resp = await this.vendor.findAndCountAll({
        where: {
          userId
        },
        include: {
          model: database.warehouse
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

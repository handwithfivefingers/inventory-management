import { ERROR } from '#/constant/message'
import database from '#/database'
import { getCtxUser } from '#/libs'
import { IVendorStatic } from '#/types/vendor'
import { Request } from 'express'
import { Sequelize } from 'sequelize'

export default class VendorService {
  model: IVendorStatic
  sequelize: Sequelize
  constructor() {
    this.model = database.vendor
    this.sequelize = database.sequelize
  }
  async create(req: Request) {
    const { name, description, userId } = req.body
    const t = await this.sequelize.transaction()
    try {
      const user = await getCtxUser(req as any)
      console.log('user', this.model)
      if (!user) throw new Error(ERROR.UNAUTHORIZED)
      // console.log('database', database)
      // const _user = await database.user.findOne({ where: { id: user.id } })
      // const _p = await database.user.findByPk(user.id).then((user: IUserStatic) => {
      //   return user.createVendor({
      //     name
      //   })
      // })

      const _vendor = await this.model.create(
        {
          name,
          userId: user.id
        },
        {
          transaction: t
        }
      )

      await t.commit()
      return {
        vendor: _vendor
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  async getVendors() {
    try {
      const resp = await this.model.findAll({
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

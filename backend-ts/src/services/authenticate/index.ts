// const db = require('@db')
// const VendorService = require('../vendor')
// const WarehouseService = require('../warehouse')
// const bcrypt = require('bcryptjs')
// const { cacheKey, cacheSet } = require('@libs/redis')
// const { cacheItem } = require('./cache')
// const { ERROR } = require('@constant/message')
// const { retrieveUser } = require('@src/libs/utils')
import Redis from '#/configs/redis'
import { ERROR } from '#/constant/message'
import database from '#/database'
import { getCtxUser } from '#/libs'
import { RoleStatic } from '#/types/role'
import { IUserStatic } from '#/types/user'
import { IVendorStatic } from '#/types/vendor'
import { IWarehouseStatic } from '#/types/warehouse'
import bcrypt from 'bcryptjs'
import { Request } from 'express'
import { Sequelize } from 'sequelize'

interface IRequestLocal extends Request {
  locals: {
    id: number
    email: string
  }
}
const { cacheDel, cacheGet, cacheSet, cacheKey } = Redis

interface IRegister {
  nickname?: string
  firstName?: string
  lastName?: string
  email: string
  password: string
  warehouse: string
  vendor: string
}

export default class AuthenticateService {
  user: IUserStatic = database['user']
  role: RoleStatic = database.role
  vendor: IVendorStatic = database.vendor
  warehouse: IWarehouseStatic = database.warehouse
  sequelize: Sequelize = database.sequelize
  constructor() {}

  async get(req: IRequestLocal): Promise<any> {
    try {
      const usr = await this.user.findOne({
        where: { id: req.locals.id },
        include: [
          {
            model: database.role,
            include: {
              model: database.permission
            } as any
          },
          {
            model: database.vendor
          }
        ]
      })
      return {
        ...usr?.parsed,
        roles: usr.roles,
        vendors: usr.vendors,
      }
    } catch (err) {
      console.log('error', err)
      throw err
    }
  }

  async login(req: Request) {
    try {
      const { email, password } = req.body
      console.log('req', req.body)
      const user = await this.user.findOne({
        where: { email }
        // include: [
        //   {
        //     model: database.role,
        //     include: {
        //       model: database.permission
        //     } as any
        //   },
        //   {
        //     model: database.vendor
        //   }
        // ]
      })
      console.log('user', user)
      if (!user) throw new Error(ERROR.USR_NOT_VALID)
      const isMatchPassword = await bcrypt.compare(password, user.password)
      if (!isMatchPassword) throw new Error(ERROR.USR_NOT_VALID)
      return user.parsed

      // const user = await cacheItem({
      //   key: cacheKey('User', email),
      //   callback: async () => {
      //     const usr = await this.user.findOne({
      //       where: { email },
      //       include: [
      //         {
      //           model: database.role,
      //           include: {
      //             model: database.permission
      //           } as any
      //         },
      //         {
      //           model: database.vendor
      //         }
      //       ]
      //     })
      //     const usrCache: Record<any, any> = usr?.dataValues || {}
      //     if (!usrCache) throw new Error(ERROR.USR_NOT_VALID)

      //     // Get all vendors and warehouses of user
      //     const vendors = await database.vendor.findAll({
      //       where: {
      //         userId: usrCache?.id
      //       },
      //       include: database.warehouse
      //     })
      //     const listVendors = []
      //     // const listWarehouse = []
      //     for (let vendor of vendors) {
      //       listVendors.push({ id: vendor.dataValues.id, name: vendor.dataValues.name })
      //       // listWarehouse.push(...vendor.dataValues.warehouses?.map((item) => item.dataValues))
      //     }
      //     usrCache.vendors = listVendors
      //     // usrCache.warehouses = listWarehouse
      //     return usrCache
      //   }
      // })

      // if (!user) throw new Error(ERROR.USR_NOT_VALID)
      // const isMatchPassword = await bcrypt.compare(password, user.password)
      // if (!user || !isMatchPassword) throw new Error('Email or Password are not valid')
      // if (user?.activeWarehouse) {
      //   delete user.password
      //   return user
      // }
      // if (!user?.vendor) {
      //   user.vendor = user.vendors[0]
      // }
      // let warehouse = user.warehouses[0]
      // user.activeWarehouse = warehouse
      // await cacheSet(cacheKey('User', email), user)

      // delete user.password
      // return user
    } catch (error) {
      console.log('LOGIN ERROR >> error', error)
      throw error
    }
  }

  async register(params: IRegister) {
    const t = await this.sequelize.transaction()
    try {
      // Hash password
      // const hash_password = await bcrypt.hash(params.password, 10)
      // Create user
      const { vendor, warehouse, ...user } = params
      const userBuilder = await this.user.build(params as any)

      console.log('parsed', userBuilder)
      // const user = await this.user.create(parsed)
      const usr = await userBuilder.save({
        transaction: t
      })
      const vendorBuilder = this.vendor.build({ name: vendor, userId: usr.id })

      const userRole = await usr.createRole(
        {
          name: 'Admin'
        },
        { transaction: t }
      )
      const permission = await userRole.createPermission(
        {
          name: 'Admin',
          C: true,
          R: true,
          U: true,
          D: true
        },
        { transaction: t }
      )
      const vendorModel = await vendorBuilder.save({
        transaction: t
      })
      const warehouseBuilder = this.warehouse.build({
        name: warehouse || 'Main Warehouse',
        isMain: true,
        vendorId: vendorModel.id,
        email: 'example@example.com', // Provide a value for the email property
        phone: '1234567890', // Provide a value for the phone property
        address: '123 Main St' // Provide a value for the address property
      })
      // const roles = await usr.createRole({
      //   name: 'Admin'
      // })

      await warehouseBuilder.save({
        transaction: t
      })

      const result = {
        ...usr.parsed,
        vendor: vendorModel,
        warehouses: [warehouseBuilder],
        roles: [userRole],
        permissions: [permission]
      }

      await t.commit()
      return result
      // Create role
      // const role = await user.createRole(
      //   {
      //     name: 'Admin'
      //   },
      //   { transaction: t }
      // )
      // // Create permission
      // const permission = await role.createPermission(
      //   {
      //     name: 'Admin',
      //     C: true,
      //     R: true,
      //     U: true,
      //     D: true
      //   },
      //   { transaction: t }
      // )
      // // Create vendor
      // const vendor = await new VendorService().createInstance(
      //   {
      //     name: params?.vendor || 'Main Vendor',
      //     description: 'Auto generating',
      //     userId: user.id
      //   },
      //   {
      //     transaction: t
      //   }
      // )
      // // Create warehouse
      // const warehouse = await new WarehouseService().createInstance(
      //   {
      //     name: params.warehouse || 'Main Warehouse',
      //     vendorId: vendor.id,
      //     description: 'Auto generating'
      //   },
      //   {
      //     transaction: t
      //   }
      // )
      // await t.commit()
      // const usr = user.dataValues
      // // Save user to redis
      // const key = cacheKey('User', user.email)
      // role.dataValues.permissions = [permission.dataValues]
      // usr.roles = [role.dataValues]
      // await cacheSet(key, { ...usr, vendor, warehouse: [warehouse] })
      // return { user, vendor, warehouse: [warehouse] }
    } catch (error) {
      // await t.rollback()
      // Check if error is caused by duplicate email
      // if (error.name === 'SequelizeUniqueConstraintError') {
      //   throw {
      //     code: error.original.code,
      //     fields: error.fields
      //   }
      // }
      await t.rollback()
      throw error
    }
  }
}

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
import { cacheItem } from './cache'

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
      // Get user email from request locals (set by auth middleware)
      const userEmail = req.locals.email
      
      const usr = await cacheItem({
        key: cacheKey('User', userEmail),
        callback: async () => {
          const user = await this.user.findOne({
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
          if (!user) throw new Error(ERROR.USR_NOT_VALID)
          return user
        }
      })
      
      if (!usr) throw new Error(ERROR.USR_NOT_VALID)
      
      return {
        ...usr.parsed,
        roles: (usr as any).roles,
        vendors: (usr as any).vendors,
      }
    } catch (err) {
      console.log('error', err)
      throw err
    }
  }

  async login(req: Request) {
    try {
      const { email, password } = req.body
      
      // Use cache to store user data
      const cacheKeyStr = cacheKey('User', email)
      
      const user = await cacheItem({
        key: cacheKeyStr,
        callback: async () => {
          const usr = await this.user.findOne({
            where: { email },
            include: [
              {
                model: database.role,
                include: {
                  model: database.permission
                } as any
              },
              {
                model: database.vendor,
                include: {
                  model: database.warehouse
                } as any
              }
            ]
          })
          
          if (!usr) throw new Error(ERROR.USR_NOT_VALID)
          
          const isMatchPassword = await bcrypt.compare(password, usr.password)
          if (!isMatchPassword) throw new Error(ERROR.USR_NOT_VALID)
          
          return usr
        }
      })
      
      if (!user) throw new Error(ERROR.USR_NOT_VALID)
      
      // Verify password if not already verified in cache callback
      if (!user.password) {
        // Password already verified in cache callback
        throw new Error(ERROR.USR_NOT_VALID)
      }
      
      const isMatchPassword = await bcrypt.compare(password, user.password)
      if (!isMatchPassword) {
        // Clear cache on failed login
        await cacheDel(cacheKeyStr)
        throw new Error(ERROR.USR_NOT_VALID)
      }

      // Build response with roles, permissions, vendors, and warehouses
      const userData = user.parsed
      const roles = (user as any).roles?.map((role: any) => ({
        id: role.id,
        name: role.name,
        permissions: role.permissions?.map((p: any) => ({
          id: p.id,
          name: p.name,
          C: p.C,
          R: p.R,
          U: p.U,
          D: p.D
        }))
      }))

      // Build vendors with warehouses list
      const vendors = (user as any).vendors?.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        warehouses: vendor.warehouses?.map((w: any) => ({
          id: w.id,
          name: w.name,
          isMain: w.isMain,
          address: w.address,
          phone: w.phone,
          email: w.email
        }))
      }))

      // Select default warehouse: prioritize isMain, then first warehouse
      let defaultWarehouseId: number | null = null
      let defaultVendorId: number | null = null

      if (vendors && vendors.length > 0) {
        defaultVendorId = vendors[0].id
        const firstVendor = vendors[0]
        if (firstVendor.warehouses && firstVendor.warehouses.length > 0) {
          const mainWarehouse = firstVendor.warehouses.find((w: any) => w.isMain)
          defaultWarehouseId = mainWarehouse ? mainWarehouse.id : firstVendor.warehouses[0].id
        }
      }

      return {
        ...userData,
        roles,
        vendors,
        defaultVendorId,
        defaultWarehouseId
      }
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
      
      // Cache the new user data
      const cacheKeyStr = cacheKey('User', params.email)
      const userData = {
        ...usr.parsed,
        vendors: [{
          ...vendorModel.dataValues,
          warehouses: [warehouseBuilder.dataValues]
        }],
        roles: [{
          ...userRole.dataValues,
          permissions: [permission.dataValues]
        }]
      }
      await cacheSet(cacheKeyStr, userData, 3600 * 24)
      
      return result
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  
  /**
   * Clear user cache by email
   */
  async clearUserCache(email: string): Promise<void> {
    try {
      await cacheDel(cacheKey('User', email))
    } catch (error) {
      console.log('Cache clear error', error)
    }
  }
}

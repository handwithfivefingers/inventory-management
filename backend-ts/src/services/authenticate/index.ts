import Redis from '#/configs/redis'
import { ERROR } from '#/constant/message'
import { getModule } from '#/constant/modules'
import database from '#/database'
import { buildFullPermissions, flattenRolePermissions } from '#/libs/permission'
import { ApiError } from '#/response'
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
interface LoginResponse {
  id: number
  email: string
  subscription: 'free' | 'pro'
  createdAt: Date
  updatedAt: Date
  roles: RoleStatic[]
  vendors: IVendorStatic[]
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

      // Cache only the base user record (cheap lookup). Roles/permissions and
      // vendors are fetched live on every call so that permission or vendor
      // changes are reflected immediately in `getMe` instead of being stale
      // for up to 24h (a fresh `getMe` must re-verify the current permissions).
      // Note: a distinct key (`User:base`) is used so it never collides with
      // the full object cached by `login`.
      const base = await this.user.findOne({
        where: { id: req.locals.id }
      })
      // const base = await cacheItem({
      //   key: cacheKey('User:base', userEmail),
      //   callback: async () => {
      //     const user = await this.user.findOne({
      //       where: { id: req.locals.id }
      //     })
      //     if (!user) throw new Error(ERROR.USR_NOT_VALID)
      //     return user
      //   }
      // })

      if (!base) throw new Error(ERROR.USR_NOT_VALID)

      const user: any = await this.user.findOne({
        where: { id: (base as any).id },
        include: [
          {
            model: database.staff,
            required: false,
            include: [
              {
                model: database.role,
                include: {
                  model: database.permission,
                  through: { attributes: ['C', 'R', 'U', 'D'] }
                } as any
              }
            ]
          },
          {
            model: database.vendor,
            include: {
              model: database.warehouse
            } as any
          }
        ]
      })

      if (!user) throw new Error(ERROR.USR_NOT_VALID)

      const staffList: any[] = (user as any).staffs ?? (user as any).staff ?? []

      let rolesRaw2 = [(staffList as any)?.role]
      const roles = rolesRaw2.map((role: any) => ({
        id: role.id,
        name: role.name,
        permissions: flattenRolePermissions(role)
      }))

      const response = {
        ...(user as any).parsed,
        roles,
        vendors: (user as any).vendors
      }
      return response
    } catch (err) {
      console.log('error', err)
      throw err
    }
  }

  async login(req: Request): Promise<LoginResponse> {
    try {
      const { email, password } = req.body
      // Use cache to store user data
      const cacheKeyStr = cacheKey('User', email)

      const user: any = await this.user.findOne({
        where: { email },
        include: [
          {
            model: database.staff,
            required: false,
            include: [
              {
                model: database.role,
                include: {
                  model: database.permission,
                  through: { attributes: ['C', 'R', 'U', 'D'] }
                } as any
              }
            ]
          },
          {
            model: database.vendor,
            include: {
              model: database.warehouse
            } as any
          }
        ]
      })

      if (!user) throw new Error(ERROR.USR_NOT_VALID)
      // Verify password if not already verified in cache callback
      if (!user.password) throw new Error(ERROR.USR_NOT_VALID)
      const isMatchPassword = await bcrypt.compare(password, user.password)
      if (!isMatchPassword) {
        // Clear cache on failed login
        await cacheDel(cacheKeyStr)
        throw new Error(ERROR.USR_NOT_VALID)
      }

      // Build response with roles, permissions, vendors, and warehouses
      // Roles now come from staff profiles (staff.role).
      const userData = user.parsed
      const staffList: any[] = (user as any).staffs ?? (user as any).staff ?? []
      let rolesRaw2 = [(staffList as any)?.role as RoleStatic]
      const roles = rolesRaw2.map((role: any) => ({
        id: role.id,
        name: role.name,
        permissions: flattenRolePermissions(role)
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

      const response = {
        ...userData,
        roles,
        vendors,
        defaultVendorId,
        defaultWarehouseId
      }
      console.log('response', response)
      return response as LoginResponse
    } catch (error) {
      console.log('LOGIN ERROR >> error', error)
      throw new ApiError(error as any)
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

      // const user = await this.user.create(parsed)
      const usr = await userBuilder.save({
        transaction: t
      })

      // Provision the owner role exactly once per account lifetime: verified
      // against the join table itself (not the unloaded association), so
      // re-invoking registration-like flows can never duplicate roles.
      const existingRoleCount = await (database as any).user_role.count({
        where: { userId: usr.id },
        transaction: t
      })
      let userRole: any = null
      if (!existingRoleCount) {
        userRole = await usr.createRole({ name: 'Admin', isGlobal: true }, { transaction: t })
        userRole = await this.role.findByPk(userRole.id, { transaction: t })
        if (!userRole) throw new Error(ERROR.USR_NOT_VALID)

        // Hybrid model: link the SHARED permission catalog onto the role with
        // full C/R/U/D join flags - never duplicate catalog rows.
        const fullPermissions = buildFullPermissions()
        for (const grant of fullPermissions) {
          const [catalogRow] = await database.permission.findOrCreate({
            where: { name: grant.name },
            defaults: { name: grant.name, description: getModule(grant.name)?.description },
            transaction: t
          })
          await (database as any).role_permission.create(
            {
              roleId: userRole.id,
              permissionId: catalogRow.id,
              C: grant.C,
              R: grant.R,
              U: grant.U,
              D: grant.D
            },
            { transaction: t }
          )
        }
        userRole.permissions = fullPermissions
      }

      const vendorBuilder = this.vendor.build({ name: vendor, userId: usr.id })
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

      await warehouseBuilder.save({
        transaction: t
      })

      const result = {
        ...usr.parsed,
        vendor: vendorModel,
        warehouses: [warehouseBuilder],
        roles: userRole ? [userRole] : []
      }

      await t.commit()

      // Cache the new user data
      // const cacheKeyStr = cacheKey('User', params.email)
      // const userData = {
      //   ...usr.parsed,
      //   vendors: [
      //     {
      //       ...vendorModel.dataValues,
      //       warehouses: [warehouseBuilder.dataValues]
      //     }
      //   ],
      //   roles: [
      //     {
      //       ...userRole.dataValues,
      //       permissions: [permission.dataValues]
      //     }
      //   ]
      // }
      // await cacheSet(cacheKeyStr, userData, 3600 * 24)

      return result
    } catch (error) {
      await t.rollback()
      throw new ApiError(error as any)
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

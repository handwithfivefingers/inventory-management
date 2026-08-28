import Redis from '#/configs/redis'
import { ERROR } from '#/constant/message'
import { getModule } from '#/constant/modules'
import database from '#/database'
import Permission from '#/database/models/permission'
import Role from '#/database/models/role'
import Staff from '#/database/models/staff'
import User from '#/database/models/user'
import Vendor from '#/database/models/vendor'
import Warehouse from '#/database/models/warehouse'
import { buildFullPermissions } from '#/libs/permission'
import { ApiError } from '#/response'
import { IStaffModel } from '#/types/staff'
import bcrypt from 'bcryptjs'
import { Sequelize } from 'sequelize'

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
  roles: Role[]
  vendors: Vendor[]
}

export default class AuthenticateService {
  sequelize: Sequelize = database.sequelize
  constructor() {}
  async get(id: number): Promise<any> {
    try {
      const user: any = await User.findByPk(id, {
        include: [
          {
            model: Staff,
            include: [
              {
                model: Role,
                attributes: {
                  exclude: ['createdAt', 'updatedAt', 'description']
                },
                include: {
                  model: Permission,
                  as: 'permissions',
                  attributes: ['id', 'name', 'method'],
                  through: { attributes: [] }
                } as any
              },
              {
                model: Vendor,
                as: 'vendors',
                include: {
                  model: Warehouse
                } as any
              }
            ]
          }
        ],
        attributes: {
          exclude: ['createdAt', 'updatedAt']
        },
        logging: console.log
      })
      if (!user) throw new Error(ERROR.USR_NOT_VALID)
      const staff = user.staff
      const vendors = staff.vendors.map((v: Vendor & { warehouses: Warehouse[] }) => ({
        id: v.id,
        name: v.name,
        warehouses: v?.warehouses?.map((w: Warehouse) => ({
          id: w.id,
          name: w.name,
          isMain: w.isMain
        }))
      }))
      console.log(JSON.stringify(user.toJSON(), null, 2))

      return { ...user.parsed, ...staff.parsed, vendors, role: user.staff.role } as LoginResponse

      // const roles = this.resolveUserRoles(user).map((role) => this.mapRole(role))
      // const vendors = this.mapVendors(user.vendors)
      // const { defaultVendorId, defaultWarehouseId } = this.resolveDefaults(user.vendors)

      // return {
      //   ...(user as any).parsed,
      //   roles,
      //   vendors,
      //   defaultVendorId,
      //   defaultWarehouseId
      // }
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  async login({
    email,
    password
  }: {
    email: string
    password: string
  }): Promise<Omit<LoginResponse, 'roles' | 'vendors'>> {
    try {
      // Use cache to store user data
      const cacheKeyStr = cacheKey('User', email)

      const user: any = await User.findOne({
        where: { email },
        include: [
          {
            model: Staff
          }
        ]
      })
      if (!user) throw new Error(ERROR.USR_NOT_VALID)
      if (!user.password) throw new Error(ERROR.USR_NOT_VALID)
      const isMatchPassword = await bcrypt.compare(password, user.password)
      if (!isMatchPassword) {
        await cacheDel(cacheKeyStr)
        throw new Error(ERROR.USR_NOT_VALID)
      }
      if (user.staff.status !== 'active') {
        await cacheDel(cacheKeyStr)
        throw new Error(ERROR.USR_INACTIVE)
      }
      const staff = user.staff.parsed as IStaffModel
      return { ...user.parsed, ...staff, role: user.staff.role } as Omit<LoginResponse, 'roles' | 'vendors'>
    } catch (error) {
      console.log('LOGIN ERROR >> error', error)
      throw new ApiError(error as any)
    }
  }

  async register(params: IRegister) {
    const t = await this.sequelize.transaction()
    try {
      console.log('params', params)
      const user = await this.createUser(params, t)
      const vendor = await this.createVendorEntity(params.vendor, user.id, t)
      const warehouse = await this.createWarehouseEntity(params.warehouse, t)
      const staff = await this.createStaffEntity(t)
      await vendor.$set('warehouses', [warehouse], { transaction: t })
      await user.$set('staff', staff, { transaction: t })
      await staff.$set('vendors', [vendor], { transaction: t })
      staff.roleId = 1
      await staff.save({ transaction: t })
      const result = {
        ...user.parsed,
        vendor,
        warehouses: [warehouse]
        // roles: ownerRole ? [ownerRole] : []
      }
      await t.commit()
      return result
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error)
    }
  }

  private async createUser(params: IRegister, transaction: any) {
    console.log('Create user')
    const { vendor, warehouse, email, password, ...userAttrs } = params
    // Password is hashed by the User model setter (bcrypt.hashSync) - no manual hash here
    const usr = User.build({ email, password })
    return usr.save({ transaction })
  }

  // private async provisionOwnerRole(user: any, transaction: any) {
  //   // Lifetime-once guarantee: check the join table itself, not unloaded associations
  //   // const existingRoleCount = await .count({
  //   //   where: { userId: user.id },
  //   //   transaction
  //   // })
  //   // if (existingRoleCount) return null
  //   // let role = await user.createRole({ name: 'Admin', isGlobal: true }, { transaction })
  //   // role = await Role.findByPk(role.id, { transaction })
  //   // if (!role) throw new Error(ERROR.USR_NOT_VALID)
  //   // await this.linkFullPermissions(role, transaction)
  //   // return role
  // }

  // private async linkFullPermissions(role: any, transaction: any) {
  //   // Hybrid model: reuse shared permission catalog rows, grant full C/R/U/D via join table
  //   const fullPermissions = buildFullPermissions()
  //   for (const grant of fullPermissions) {
  //     const [catalogRow] = await database.permission.findOrCreate({
  //       where: { name: grant.name },
  //       defaults: { name: grant.name, description: getModule(grant.name)?.description },
  //       transaction
  //     })
  //     await (database as any).role_permission.create(
  //       {
  //         roleId: role.id,
  //         permissionId: catalogRow.id,
  //         C: grant.C,
  //         R: grant.R,
  //         U: grant.U,
  //         D: grant.D
  //       },
  //       { transaction }
  //     )
  //   }
  //   role.permissions = fullPermissions
  // }

  private async createVendorEntity(name: string, userId: number, transaction: any) {
    console.log('Create vendo')
    const builder = Vendor.build({ name, userId })
    return builder.save({ transaction })
  }

  private async createWarehouseEntity(name: string | undefined, transaction: any) {
    console.log('Create warehouse')
    const builder = database.warehouse.build({
      name: name || 'Main Warehouse',
      isMain: true,
      email: 'example@example.com',
      phone: '1234567890',
      address: '123 Main St'
    })
    await builder.save({ transaction })
    return builder
  }

  private async createStaffEntity(transaction: any) {
    console.log('Create staff')
    const builder = Staff.build({
      // userId,
      fullName: 'Admin',
      email: 'example@example.com',
      phone: '1234567890',
      code: 'NV-0001',
      gender: 'other',
      status: 'active'
    })
    return builder.save({ transaction })
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

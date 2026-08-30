import Redis from '#/configs/redis'
import { ERROR } from '#/constant/message'
import database from '#/database'
import Permission from '#/database/models/permission'
import Role from '#/database/models/role'
import Staff from '#/database/models/staff'
import User from '#/database/models/user'
import Vendor from '#/database/models/vendor'
import Warehouse from '#/database/models/warehouse'
import { ApiError } from '#/response'
import { IStaffModel } from '#/types/staff'
import bcrypt from 'bcryptjs'
import { Sequelize, Transaction } from 'sequelize'

const { cacheDel, cacheGet, cacheSet, cacheKey } = Redis

interface IRegister {
  fullName?: string
  email: string
  password: string
  warehouse: string
  vendor: string
  niche?: string
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
      return { ...user.parsed, ...staff.parsed, vendors, role: user.staff.role } as LoginResponse
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
      const { vendor, warehouse, email, password, fullName, niche = 'other' } = params
      const user = await this.createUser({
        email,
        password,
        transaction: t
      })
      const _vendor = await this.createVendorEntity({
        name: vendor,
        userId: user.id,
        transaction: t,
        niche
      })
      const _warehouse = await this.createWarehouseEntity({ name: warehouse, transaction: t })

      const staff = await this.createStaffEntity({ transaction: t, fullName })

      await _vendor.$set('warehouses', [_warehouse], { transaction: t })

      await user.$set('staff', staff, { transaction: t })

      await staff.$set('vendors', [_vendor], { transaction: t })

      const role = await Role.findOne({ where: { isAdmin: true }, attributes: ['id'] })

      if (!role) throw new Error('Admin Role not found')

      staff.roleId = role.id

      await staff.save({ transaction: t })

      const result = {
        ...user.parsed,
        vendor: _vendor,
        warehouses: [_warehouse]
      }
      await t.commit()
      return result
    } catch (error) {
      console.log('error', error)
      await t.rollback()
      throw ApiError.from(error)
    }
  }

  private async createUser({
    email,
    password,
    transaction
  }: {
    email: string
    password: string
    transaction: Transaction
  }) {
    const usr = User.build({ email, password })
    return usr.save({ transaction })
  }

  private async createVendorEntity({
    name,
    userId,
    niche = 'other',
    transaction
  }: Partial<Vendor> & { transaction: Transaction }) {
    const builder = Vendor.build({ name, userId, niche })
    return builder.save({ transaction })
  }

  private async createWarehouseEntity({ name, transaction }: Partial<Warehouse> & { transaction: Transaction }) {
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

  private async createStaffEntity({
    transaction,
    fullName = 'Admin',
    phone = '1234567890',
    code = 'NV-0001',
    gender = 'other',
    status = 'active'
  }: Partial<Staff> & { transaction: Transaction }) {
    const builder = Staff.build({
      fullName: fullName,
      phone: phone,
      code: code,
      gender: gender,
      status: status
    })
    return builder.save({ transaction })
  }

  async clearUserCache(email: string): Promise<void> {
    try {
      await cacheDel(cacheKey('User', email))
    } catch (error) {
      console.log('Cache clear error', error)
    }
  }
}

import database from '#/database'
import { ApiError } from '#/response'
import { getPagination } from '#/utils'
import { nextSequence } from '#/utils/sequence'
import { Op, Sequelize } from 'sequelize'
import { invalidateUserAuthCache } from '#/services/authenticate/userAuth'
import { invalidateUserAuthCache } from '#/services/authenticate/userAuth'

const ALLOWED_STAFF_FIELDS = [
  'fullName',
  'gender',
  'phone',
  'salary',
  'hireDate',
  'status',
  'address',
  'roleId'
] as const

function pickStaffFields(input: any): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of ALLOWED_STAFF_FIELDS) {
    if (input[key] !== undefined) out[key] = input[key]
  }
  return out
}

interface StaffBodyParams {
  vendorId?: number
  roleId: number
  email: string
  status: 'active' | 'inactive'
  gender: 'male' | 'female' | 'other'
  password?: string
  code?: string
  fullName?: string
  phone?: string
  salary?: number
  hireDate?: string | Date
  address?: string
}
export class StaffService {
  sequelize: Sequelize = database.sequelize
  async getStaffs(req: any) {
    try {
      const { offset, limit, vendorId: paginationVendorId } = getPagination(req.query as any)
      const where: any = {}
      const vendorId = (req.query as any).vendorId ?? paginationVendorId
      if (vendorId) where.vendorId = Number(vendorId)
      if (req.query.status) where.status = req.query.status
      if (req.query.gender) where.gender = req.query.gender
      if (req.query.roleId) where.roleId = Number(req.query.roleId)
      if (req.query.q) {
        const q = `%${req.query.q}%`
        where[Op.or] = [{ fullName: { [Op.like]: q } }, { code: { [Op.like]: q } }, { phone: { [Op.like]: q } }]
        ;(where as any).fullName = { [Op.like]: q }
      }

      const include: any[] = [
        { model: database.user, attributes: { exclude: ['password', 'parsed', 'secret', 'createdAt', 'updatedAt'] } },
        {
          model: database.role,
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'vendorId', 'description']
          },
          include: {
            model: database.permission,
            as: 'permissions',
            attributes: ['name', 'method'],
            through: { attributes: [] }
          } as any
        }
        // {
        //   model: database.vendor,
        //   attributes: {
        //     exclude: ['createdAt', 'updatedAt']
        //   }
        // }
      ]

      const resp = await database.staff.findAndCountAll({
        where,
        include,
        offset: Number(offset),
        limit: Number(limit),
        distinct: true,
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: ['userId', 'vendorId', 'roleId']
        },
        // raw: true,
        nest: true
      })
      return resp
    } catch (error) {
      console.log('getStaffs error', error)
      throw ApiError.from(error, 400)
    }
  }

  async getById(id: number) {
    try {
      const include: any[] = [
        { model: database.user, attributes: { exclude: ['password', 'parsed', 'secret', 'createdAt', 'updatedAt'] } },
        {
          model: database.role,
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'vendorId', 'description']
          },
          include: {
            model: database.permission,
            as: 'permissions',
            attributes: ['name', 'method'],
            through: { attributes: [] }
          } as any
        }
        // {
        //   model: database.vendor,
        //   attributes: {
        //     exclude: ['createdAt', 'updatedAt']
        //   }
        // }
      ]

      const row = await database.staff.findByPk(id, { include })
      if (!row) throw ApiError.from(new Error('Staff not found'), 404)
      return row.toJSON()
    } catch (error) {
      if ((error as any)?.statusCode === 404) throw error
      throw error
    }
  }

  async create(body: StaffBodyParams) {
    const t = await this.sequelize.transaction()
    try {
      const {
        password,
        email,
        roleId,
        vendorId,
        phone,
        gender = 'other',
        salary,
        hireDate = null,
        status,
        address,
        fullName
      } = body
      if (!password || password?.length < 6) throw new Error('Password must be at least 6 characters')
      if (!roleId) throw new Error('Role not selected')
      const count = await database.user.count({ where: { email } })
      if (count > 0) throw new Error('User already exists')
      const lastStaff = await database.staff.findOne({
        order: [['id', 'DESC']],
        limit: 1,
        transaction: t
      })
      const initial = Number((lastStaff as any)?.get?.('id') ?? (lastStaff as any)?.id ?? 0) + 1
      const seq = await nextSequence('staff', null, { transaction: t, initial })
      const code = `NV-${String(seq).padStart(4, '0')}`

      const _user = await database.user.create({ email, password, subscription: 'free' }, { transaction: t })

      const _staff = await database.staff.create(
        {
          code,
          phone,
          gender,
          salary: Number(salary),
          hireDate: hireDate ? new Date(hireDate) : undefined,
          status,
          address,
          fullName: fullName || '',
          userId: _user.id,
          roleId: Number(roleId)
          // vendorId: Number(vendorId)
        },
        { transaction: t }
      )

      await _staff.$set('vendors', Number(vendorId), { transaction: t })
      console.log(_staff)
      await (t as any).commit?.()
      // Invalidate auth cache: new staff -> new vendor/role scope for the user
      try {
        await invalidateUserAuthCache(Number(_user.id))
      } catch {}
      return _staff.toJSON()
    } catch (error) {
      await t.rollback()
      console.log('staff create error', error)
      throw ApiError.from(error, 400)
    }
  }

  async update(id: number, body: Partial<StaffBodyParams>) {
    try {
      const payload: Omit<Partial<StaffBodyParams>, 'hireDate'> & { hireDate?: Date } = pickStaffFields(body)
      // if ('fullName' in payload && (!payload.fullName || String(payload.fullName).trim() === '')) {
      //   throw new Error('fullName cannot be empty')
      // }

      const staff = await database.staff.findByPk(id)
      if (staff == null) {
        throw new Error('Staff not found')
      }

      if (payload.roleId !== undefined) {
        const r = Number(payload.roleId)
        if (!Number.isFinite(r) || r <= 0) throw new Error('Invalid roleId')
        const roleRow = await database.role.findByPk(r)
        if (!roleRow) throw new Error('Role not found')
        payload.roleId = r
      }
      if (
        payload.gender !== undefined &&
        payload.gender !== null &&
        !['male', 'female', 'other'].includes(payload.gender)
      ) {
        throw new Error('Invalid gender')
      }
      if (payload.status !== undefined && !['active', 'inactive'].includes(payload.status)) {
        throw new Error('Invalid status')
      }

      delete (payload as any).password
      delete (payload as any).createAccount
      delete (payload as any).accountEmail
      delete (payload as any).email
      delete (payload as any).code

      if (Object.keys(payload).length === 0) {
        throw new Error('No valid fields to update')
      }
      console.log('payload', payload)
      const [affectedRows] = await database.staff.update(payload, { where: { id } })
      // Invalidate auth cache for owner user (role/status changes affect permissions & vendor scope)
      if (affectedRows) {
        try {
          const userId = (staff as any).userId ?? (staff as any).get?.('userId')
          if (userId) await invalidateUserAuthCache(Number(userId))
        } catch {}
      }
      return affectedRows
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  async remove(id: number) {
    try {
      let staff = await database.staff.findByPk(id)
      if (!staff) throw new Error('Staff not found')
      const userIdToInvalidate = (staff as any).userId ?? (staff as any).get?.('userId')
      if (staff && typeof staff.destroy === 'function' && database.sequelize.transaction) {
        const t = await database.sequelize.transaction()
        try {
          if (staff.userId) {
            try {
              const otherCount = await (database.staff as any).count({
                where: { userId: staff.userId, id: { [Op.ne]: id } },
                transaction: t
              })
              if (otherCount === 0) {
                await (database as any).user.destroy({ where: { id: staff.userId }, transaction: t })
              }
            } catch {}
          }
          await staff.destroy({ transaction: t })
          await (t as any).commit?.()
          try {
            if (userIdToInvalidate) await invalidateUserAuthCache(Number(userIdToInvalidate))
          } catch {}
          return { message: 'Delete successfully' } as any
        } catch (e) {
          await (t as any).rollback?.()
          throw e
        }
      }
      const result = await (database.staff as any).destroy({ where: { id } })
      try {
        if (userIdToInvalidate) await invalidateUserAuthCache(Number(userIdToInvalidate))
      } catch {}
      return result
    } catch (error) {
      throw error
    }
  }
}

export default StaffService

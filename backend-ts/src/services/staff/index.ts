import database from '#/database'
import { ApiError } from '#/response'
import { getPagination } from '#/utils'
import { evictCachedEntity } from '#/utils/entity-cache'
import { isDuplicateEntryError, nextSequence } from '#/utils/sequence'
import { getRequestedVendorId, getVendorScope, vendorWhere } from '#/utils/tenant'
import { Op, Sequelize } from 'sequelize'
import { invalidateUserAuthCache, invalidateUsersByVendorId } from '#/services/authenticate/userAuth'

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

/** Normalize vendor reassignment input; `null` = no vendor change requested. */
function normalizeVendorIds(input: unknown): number[] | null {
  if (input === undefined || input === null || input === '') return null
  const list = Array.isArray(input) ? input : [input]
  const ids = list.map(Number).filter((n) => Number.isFinite(n))
  return ids
}

/** Split "Nguyen Van A" -> { firstName: 'Nguyen Van', lastName: 'A' }. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isValidEmail = (email: unknown): boolean => typeof email === 'string' && EMAIL_PATTERN.test(email.trim())

interface StaffBodyParams {
  vendorId?: number
  vendorIds?: number[]
  roleId?: number
  email?: string
  accountEmail?: string
  createAccount?: boolean
  userId?: number
  warehouseId?: number
  status?: 'active' | 'inactive'
  gender?: 'male' | 'female' | 'other'
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
      const { offset, limit } = getPagination(req.query as any)
      const requestedVendorId = getRequestedVendorId(req)
      const where: any = {
        ...vendorWhere(getVendorScope(req), requestedVendorId ?? undefined)
      }
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
        },
        {
          model: database.vendor,
          attributes: {
            exclude: ['createdAt', 'updatedAt']
          }
        }
      ]

      const row = await database.staff.findByPk(id, { include })
      if (!row) throw ApiError.from(new Error('Staff not found'), 404)
      return row
    } catch (error) {
      if ((error as any)?.statusCode === 404) throw error
      throw error
    }
  }

  /** True when the payload asks for a login account (explicit flag or password/accountEmail present). */
  private wantsLoginAccount(body: StaffBodyParams): boolean {
    if ((body as any)?.userId != null) return false
    if ((body as any)?.createAccount === true) return true
    if ((body as any)?.createAccount === false) return (body as any)?.password != null && (body as any)?.password !== ''
    return (body as any)?.password != null && (body as any)?.password !== ''
  }

  /** Validate provisioning input; returns the normalized account email. */
  private validateAccountInput(body: StaffBodyParams): string {
    const email = ((body as any)?.accountEmail ?? (body as any)?.email) as string | undefined
    if (email == null || String(email).trim() === '') {
      throw new Error('Email is required to create login account')
    }
    if (!isValidEmail(email)) throw new Error('Invalid email format')
    const password = (body as any)?.password
    if (password == null || String(password).length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    return String(email).trim()
  }

  /** Resolve the role for a provisioned account: explicit id wins, else the default Staff role. */
  private async resolveAccountRoleId(body: StaffBodyParams, t: any): Promise<number> {
    const explicit = (body as any)?.roleId
    if (explicit != null && String(explicit).trim() !== '') {
      const role = await database.role.findByPk(Number(explicit), { transaction: t })
      if (!role) throw new Error('Role not found')
      return Number((role as any).id ?? (role as any).get?.('id') ?? explicit)
    }
    const [rows] = (await this.sequelize.query(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER(:name) LIMIT 1`,
      { replacements: { name: 'staff' }, transaction: t }
    )) as any
    const fallback = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    const fallbackId = Number((fallback as any)?.id)
    if (!Number.isFinite(fallbackId)) throw new Error('roleId is required')
    return fallbackId
  }

  /** Provision the login user + role link; returns the created user. */
  private async provisionLoginAccount(email: string, body: StaffBodyParams, roleId: number, t: any) {
    const existing = await (database as any).user.findOne({ where: { email }, transaction: t })
    if (existing) throw new Error('Email already in use')
    const { firstName, lastName } = splitFullName(String((body as any)?.fullName ?? ''))
    const user = await (database as any).user.create(
      {
        firstName,
        lastName,
        nickname: String((body as any)?.fullName ?? ''),
        email,
        password: (body as any)?.password
      },
      { transaction: t }
    )
    await (database as any).user_role.create(
      { userId: Number((user as any).id ?? (user as any).get?.('id')), roleId },
      { transaction: t }
    )
    return user
  }

  /** Next staff code (NV-XXXX) from the atomic counter. */
  private async nextStaffCode(t: any): Promise<string> {
    const lastStaff = await database.staff.findOne({
      order: [['id', 'DESC']],
      limit: 1,
      transaction: t
    })
    const initial = Number((lastStaff as any)?.get?.('id') ?? (lastStaff as any)?.id ?? 0) + 1
    const seq = await nextSequence('staff', null, { transaction: t, initial })
    return `NV-${String(seq).padStart(4, '0')}`
  }

  /** Persist the staff row, retrying once when the unique code index trips. */
  private async persistStaffWithRetry(payload: Record<string, any>, t: any) {
    try {
      return await database.staff.create(payload, { transaction: t })
    } catch (error) {
      if (!isDuplicateEntryError(error)) throw error
      const retryPayload = { ...payload, code: await this.nextStaffCode(t) }
      return await database.staff.create(retryPayload, { transaction: t })
    }
  }

  async create(body: StaffBodyParams) {
    const t = await this.sequelize.transaction()
    try {
      const { fullName, vendorId } = body ?? {}
      if (vendorId == null || String(vendorId).trim() === '') throw new Error('vendorId is required')

      // Explicit user link: no provisioning, just attach the staff row.
      const explicitUserId = (body as any)?.userId
      if (explicitUserId != null) {
        const code = await this.nextStaffCode(t)
        const linked = await this.persistStaffWithRetry(
          { fullName, vendorId: Number(vendorId), code, userId: Number(explicitUserId) },
          t
        )
        await (t as any).commit?.()
        return linked
      }

      let userId: number | undefined
      let roleId: number | undefined
      if (this.wantsLoginAccount(body)) {
        const email = this.validateAccountInput(body)
        roleId = await this.resolveAccountRoleId(body, t)
        const user = await this.provisionLoginAccount(email, body, roleId, t)
        userId = Number((user as any).id ?? (user as any).get?.('id'))
        try {
          await invalidateUserAuthCache(userId)
        } catch {}
      }

      const code = await this.nextStaffCode(t)
      const payload: Record<string, any> = {
        fullName,
        vendorId: Number(vendorId),
        code
      }
      for (const key of ['email', 'phone', 'gender', 'salary', 'hireDate', 'status', 'address'] as const) {
        if ((body as any)?.[key] !== undefined) payload[key] = (body as any)[key]
      }
      if (userId != null) payload.userId = userId
      if (roleId != null) payload.roleId = roleId

      const staff = await this.persistStaffWithRetry(payload, t)
      console.log(staff)
      await (t as any).commit?.()
      // Invalidate auth cache: new staff -> new vendor/role scope for the user
      try {
        if (userId != null) await invalidateUserAuthCache(Number(userId))
      } catch {}
      return staff
    } catch (error) {
      await t.rollback()
      console.log('staff create error', error)
      throw ApiError.from(error, 400)
    }
  }

  async update(id: number, body: Partial<StaffBodyParams> & { vendorIds?: number[] }) {
    try {
      const payload: Omit<Partial<StaffBodyParams>, 'hireDate'> & { hireDate?: Date } = pickStaffFields(body)
      // if ('fullName' in payload && (!payload.fullName || String(payload.fullName).trim() === '')) {
      //   throw new Error('fullName cannot be empty')
      // }

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

      // Vendor reassignment is handled via staff_vendor below, so a
      // vendor-only update is valid even when no staff columns change.
      const nextVendorIds = normalizeVendorIds((body as any)?.vendorId ?? (body as any)?.vendorIds)
      if (Object.keys(payload).length === 0 && !nextVendorIds) {
        throw new Error('No valid fields to update')
      }
      console.log('payload', payload)
      let affectedRows = 0
      if (Object.keys(payload).length > 0) {
        ;[affectedRows] = await database.staff.update(payload, { where: { id } })
      }

      // Vendor reassignment changes the user's vendorIds scope: persist the
      // staff_vendor links and invalidate the owner's cached auth context.
      if (nextVendorIds) {
        try {
          const staffRow: any = await database.staff.findByPk(id)
          if (staffRow && typeof (staffRow as any).$set === 'function') {
            await (staffRow as any).$set('vendors', nextVendorIds)
          } else {
            await database.sequelize.query(`DELETE FROM staff_vendor WHERE staffId = :id`, {
              replacements: { id }
            } as any)
            for (const vendorId of nextVendorIds) {
              await (database as any).staff_vendor?.create?.({ staffId: id, vendorId })
            }
          }
        } catch (e) {
          console.log('staff vendor reassign error', e)
        }
        try {
          for (const vendorId of nextVendorIds) {
            try {
              await invalidateUsersByVendorId(Number(vendorId))
            } catch {}
          }
        } catch {}
      }
      return affectedRows
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  async remove(id: number) {
    try {
      const result = await (database.staff as any).destroy({ where: { id } })
      return result
    } catch (error) {
      throw error
    }
  }
}

export default StaffService

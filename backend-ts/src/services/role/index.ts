import database from '#/database'
import { ApiError } from '#/response'
import { invalidateUsersByRoleId, invalidateUserAuthCache } from '#/services/authenticate/userAuth'
import { RoleStatic } from '#/types/role'
import { NextFunction, Request, Response } from 'express'
import { Op, Sequelize } from 'sequelize'

type METHOD = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
interface IPermissionInput {
  name: string
  ids: METHOD[]
}

interface IRoleInput {
  id: number
  vendorId: number
  name: string
  description?: string
  isGlobal?: boolean
  permissions?: IPermissionInput[]
}
interface RoleUpdateParams {
  id: number
  vendorId: number
  name: string
  description?: string
  permissions?: IPermissionInput[]
}

interface GetRoleByIdResponse {
  id: number
  vendorId: number
  name: string
  description: string
  isGlobal: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
  permissions: { id: number; name: string; method: METHOD }[]
}

export class RoleService {
  model: Role
  sequelize: Sequelize | undefined
  constructor() {
    this.model = database.role
    this.sequelize = database.sequelize
  }

  /**
   * Get all roles with permissions (filtered by vendor).
   * Permissions are returned in the flat {id,name,C,R,U,D} shape - flags
   * resolved from the role_permissions join table.
   */
  async getRoles(vendorId?: number | null) {
    try {
      if (!vendorId) throw new Error('Vendor is required')
      const where: any = {}
      where[Op.or] = [{ vendorId }, { isGlobal: true }]
      const _roles = await database.role.findAll({
        where,
        attributes: {
          include: [[database.sequelize.fn('COUNT', database.sequelize.col('permissions.id')), 'permissionCount']]
        },
        include: [
          {
            model: database.permission,
            as: 'permissions',
            attributes: [],
            through: { attributes: [] }
          }
        ],
        group: ['role.id'],
        order: [['id', 'ASC']],
        raw: true
      })
      return _roles
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Get role by ID (permissions flattened, see getRoles).
   */
  async getRoleById({ id, vendorId }: { id: number; vendorId: number }): Promise<GetRoleByIdResponse> {
    try {
      // vendorId filter must allow global roles (vendorId IS NULL)
      const where: any = vendorId ? { id, [Op.or]: [{ vendorId }, { isGlobal: true }] } : { id }
      // if you want strict per-vendor: use { id, vendorId } instead
      const role = await database.role.findOne({
        where,
        include: [
          {
            model: database.permission,
            as: 'permissions',
            attributes: ['id', 'name', 'method'],
            through: { attributes: [] }
          } as any
        ]
      })
      if (!role) {
        throw new Error('Role not found')
      }
      return { ...role.toJSON() }
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Grant a set of sanitized permissions on a role by linking the shared
   * catalog rows with per-role C/R/U/D join flags.
   */
  // private async grantPermissions(roleId: number, permissions: ReturnType<typeof sanitizePermissions>, t?: any) {
  //   for (const grant of permissions) {
  //     const [catalogRow] = await database.permission.findOrCreate({
  //       where: { name: grant.name },
  //       defaults: { name: grant.name, description: grant.description },
  //       transaction: t
  //     })
  //     await (database as any).role_permission.create(
  //       {
  //         roleId,
  //         permissionId: catalogRow.id,
  //         C: grant.C,
  //         R: grant.R,
  //         U: grant.U,
  //         D: grant.D
  //       },
  //       { transaction: t }
  //     )
  //   }
  // }

  /**
   * Create new role with permissions
   */
  async create({
    name,
    description,
    vendorId,
    permissions
  }: IRoleInput): Promise<Omit<GetRoleByIdResponse, 'permissions'>> {
    const t = await this.sequelize?.transaction()
    try {
      const _role = await database.role.create(
        {
          name,
          description,
          vendorId: vendorId || null,
          isGlobal: false,
          isSystem: false
        },
        {
          transaction: t
        }
      )

      if (permissions !== undefined) {
        const permissionIds = permissions
          .map((p) => p.ids)
          .flat()
          .filter((n) => Number.isFinite(n))
        await (_role as any).setPermissions(permissionIds, { transaction: t })
      }

      await t?.commit()

      return _role.toJSON() as Omit<GetRoleByIdResponse, 'permissions'>
    } catch (error) {
      await t?.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Update role and permissions - supports direct `permissions` via belongsToMany
   * without touching `role_permissions` manually.
   */
  async update({ id, vendorId, name, description, permissions }: RoleUpdateParams): Promise<GetRoleByIdResponse> {
    const t = await this.sequelize?.transaction()
    try {
      const role = await database.role.findOne({ where: { id, vendorId } })
      if (!role) throw new Error('Role not found')
      if (name !== undefined || description !== undefined) {
        await role.update({ name, description } as any, { transaction: t })
      }
      if (permissions !== undefined) {
        const permissionIds = permissions
          .map((p) => p.ids)
          .flat()
          .filter((n) => Number.isFinite(n))
        await (role as any).setPermissions(permissionIds, { transaction: t })
      }

      await t?.commit()

      // Permissions changed -> invalidate all users holding this role
      try {
        await invalidateUsersByRoleId(Number(id))
      } catch {}

      const updatedRole = await this.getRoleById({ id: Number(id), vendorId: Number(vendorId) })
      return updatedRole as GetRoleByIdResponse
    } catch (error) {
      console.log('error', error)
      await t?.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Delete role
   */
  async delete(...[req, res, next]: [Request, Response, NextFunction]) {
    const { id } = req.params
    const t = await this.sequelize?.transaction()

    try {
      const role = await database.role.findByPk(id)
      if (!role) {
        throw new Error('Role not found')
      }

      // Prevent deleting system/default roles (isSystem flag) and legacy Admin by name
      const isSystem = (role as any).isSystem === true || (role as any).get?.('isSystem') === true
      if (isSystem || role.name.toLowerCase() === 'admin') {
        throw new Error('Cannot delete system role')
      }

      // Delete permission links first (join rows), then the role itself.
      await (database as any).role_permission.destroy({
        where: { roleId: role.id },
        transaction: t
      })
      await database.user_role.destroy({ where: { roleId: role.id }, transaction: t })

      // Delete role
      await role.destroy({ transaction: t })

      await t?.commit()

      try {
        await invalidateUsersByRoleId(Number(role.id))
      } catch {}

      return {
        message: 'Role deleted successfully'
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }

  /**
   * Assign role to user (with vendor context).
   *
   * A user holds exactly ONE role: any previous assignment is replaced.
   * Re-assigning the same role is a no-op (idempotent).
   */
  async assignToUser(...[req, res, next]: [Request, Response, NextFunction]) {
    const { userId, roleId, vendorId } = req.body
    const t = await this.sequelize?.transaction()

    try {
      const user = await database.user.findByPk(userId)
      const role = await database.role.findByPk(roleId)

      if (!user) {
        throw new Error('User not found')
      }
      if (!role) {
        throw new Error('Role not found')
      }

      // Check if role belongs to vendor (if vendorId provided)
      if (vendorId && role.vendorId && role.vendorId !== vendorId) {
        throw new Error('Role does not belong to this vendor')
      }

      const resolvedVendorId = vendorId || role.vendorId || null

      const existing = await database.user_role.findOne({
        where: { userId },
        transaction: t
      })

      if (existing) {
        if ((existing as any).roleId === roleId) {
          await t?.commit()
          return {
            message: 'Role assigned successfully',
            replaced: false
          }
        }
        // Single-role policy: swap the old assignment out before adding.
        await (existing as any).destroy({ transaction: t })
      }

      await database.user_role.create(
        {
          userId,
          roleId,
          vendorId: resolvedVendorId
        },
        { transaction: t }
      )

      await t?.commit()

      try {
        await invalidateUserAuthCache(Number(userId))
        if (existing) {
          const oldRoleId = (existing as any).roleId ?? (existing as any).get?.('roleId')
          if (oldRoleId) await invalidateUsersByRoleId(Number(oldRoleId))
        }
      } catch {}

      return {
        message: 'Role assigned successfully',
        replaced: !!existing
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }

  /**
   * Remove role from user
   */
  async removeFromUser(...[req, res, next]: [Request, Response, NextFunction]) {
    const { userId, roleId, vendorId } = req.body
    const t = await this.sequelize?.transaction()

    try {
      const where: any = { userId, roleId }
      if (vendorId) {
        where.vendorId = vendorId
      }

      await database.user_role.destroy({ where, transaction: t })
      await t?.commit()

      try {
        await invalidateUserAuthCache(Number(userId))
        await invalidateUsersByRoleId(Number(roleId))
      } catch {}

      return {
        message: 'Role removed successfully'
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }
}

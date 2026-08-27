import database from '#/database'
import { getModule, isModuleKey, MODULE_KEYS_LIST } from '#/constant/modules'
import { flattenRolePermissions } from '#/libs/permission'
import { RoleStatic } from '#/types/role'
import { NextFunction, Request, Response } from 'express'
import { Sequelize, Op } from 'sequelize'

interface IPermissionInput {
  id?: number
  name: string
  C: boolean
  R: boolean
  U: boolean
  D: boolean
}

interface IRoleInput {
  name: string
  description?: string
  vendorId?: number | null
  isGlobal?: boolean
  permissions?: IPermissionInput[]
}

/**
 * Validate + normalize a permission payload against the canonical module
 * registry. Unknown module keys are rejected so the permission catalog can
 * never drift from what the backend actually enforces; CRUD flags are
 * clamped to real booleans.
 */
export const sanitizePermissions = (permissions?: IPermissionInput[]) => {
  if (!permissions?.length) return []
  return permissions.map((permission) => {
    const name = String(permission.name ?? '').trim().toLowerCase()
    if (!isModuleKey(name)) {
      throw new Error(
        `Unknown permission module "${permission.name}". Allowed modules: ${MODULE_KEYS_LIST.join(', ')}`
      )
    }
    return {
      name,
      description: getModule(name)?.description,
      C: permission.C === true,
      R: permission.R === true,
      U: permission.U === true,
      D: permission.D === true
    }
  })
}

export class RoleService {
  model: RoleStatic
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
      const where: any = {}

      // Filter by vendor: show vendor-specific roles + global roles
      if (vendorId) {
        where[Op.or] = [
          { vendorId },
          { isGlobal: true }
        ]
      }

      const _roles = await this.model.findAll({
        where,
        include: {
          model: database.permission,
          through: { attributes: ['C', 'R', 'U', 'D'] }
        } as any,
        order: [['id', 'ASC']]
      })
      return _roles.map((role: any) => ({
        ...role.toJSON(),
        permissions: flattenRolePermissions(role)
      }))
    } catch (error) {
      throw error
    }
  }

  /**
   * Get role by ID (permissions flattened, see getRoles).
   */
  async getRoleById(id: number) {
    try {
      const role = await this.model.findByPk(id, {
        include: {
          model: database.permission,
          through: { attributes: ['C', 'R', 'U', 'D'] }
        } as any
      })
      if (!role) {
        throw new Error('Role not found')
      }
      return {
        ...(role as any).toJSON(),
        permissions: flattenRolePermissions(role as any)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Grant a set of sanitized permissions on a role by linking the shared
   * catalog rows with per-role C/R/U/D join flags.
   */
  private async grantPermissions(roleId: number, permissions: ReturnType<typeof sanitizePermissions>, t?: any) {
    for (const grant of permissions) {
      const [catalogRow] = await database.permission.findOrCreate({
        where: { name: grant.name },
        defaults: { name: grant.name, description: grant.description },
        transaction: t
      })
      await (database as any).role_permission.create(
        {
          roleId,
          permissionId: catalogRow.id,
          C: grant.C,
          R: grant.R,
          U: grant.U,
          D: grant.D
        },
        { transaction: t }
      )
    }
  }

  /**
   * Create new role with permissions
   */
  async create(...[req, res, next]: [Request, Response, NextFunction]) {
    const { name, description, permissions }: IRoleInput = req.body
    const t = await this.sequelize?.transaction()
    console.log('req.body', req.body)
    try {
      const _role = await this.model.create(
        {
          name,
          description,
          vendorId: req.body.vendorId || null,
          isGlobal: req.body.isGlobal || false
        },
        {
          transaction: t
        }
      )

      if (permissions && permissions.length > 0) {
        await this.grantPermissions((_role as any).id, sanitizePermissions(permissions), t)
      }

      await t?.commit()

      // Return role with permissions
      const roleWithPermissions = await this.getRoleById(_role.id)

      return {
        role: roleWithPermissions
      }
    } catch (error) {
      console.log('error', error)
      await t?.rollback()
      throw error
    }
  }

  /**
   * Update role and permissions
   */
  async update(...[req, res, next]: [Request, Response, NextFunction]) {
    const { id } = req.params
    const { name, description, permissions }: IRoleInput = req.body
    const t = await this.sequelize?.transaction()

    try {
      const role = await this.model.findByPk(id)
      if (!role) {
        throw new Error('Role not found')
      }

      // Update role info
      await role.update({ name, description }, { transaction: t })

      // Replace the permission set: clear the join rows, then re-link the
      // catalog with the submitted flags.
      const sanitized = sanitizePermissions(permissions)
      await (database as any).role_permission.destroy({
        where: { roleId: Number(id) },
        transaction: t
      })
      await this.grantPermissions(Number(id), sanitized, t)

      await t?.commit()

      // Return updated role with permissions
      const updatedRole = await this.getRoleById(Number(id))

      return {
        role: updatedRole
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }

  /**
   * Delete role
   */
  async delete(...[req, res, next]: [Request, Response, NextFunction]) {
    const { id } = req.params
    const t = await this.sequelize?.transaction()

    try {
      const role = await this.model.findByPk(id)
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
      const role = await this.model.findByPk(roleId)

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

      await database.user_role.create({
        userId,
        roleId,
        vendorId: resolvedVendorId
      }, { transaction: t })

      await t?.commit()

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

      return {
        message: 'Role removed successfully'
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }
}

import database from '#/database'
import { RoleStatic } from '#/types/role'
import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize'

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
  permissions?: IPermissionInput[]
}

export class RoleService {
  model: RoleStatic
  sequelize: Sequelize | undefined
  constructor() {
    this.model = database.role
    this.sequelize = database.sequelize
  }

  /**
   * Get all roles with permissions
   */
  async getRoles() {
    try {
      const _roles = await this.model.findAll({
        include: {
          model: database.permission
        },
        order: [['id', 'ASC']]
      })
      return _roles
    } catch (error) {
      throw error
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: number) {
    try {
      const role = await this.model.findByPk(id, {
        include: {
          model: database.permission
        }
      })
      if (!role) {
        throw new Error('Role not found')
      }
      return role
    } catch (error) {
      throw error
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
          description
        },
        {
          transaction: t
        }
      )

      if (permissions && permissions.length > 0) {
        for (const { id, ...perm } of permissions) {
          await (_role as any).createPermission(perm, {
            transaction: t
          })
        }
      }

      await t?.commit()

      // Return role with permissions
      const roleWithPermissions = await this.model.findByPk(_role.id, {
        include: {
          model: database.permission
        }
      })

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

      // Delete existing permissions
      await (role as any).permissions?.destroy({ transaction: t })

      // Create new permissions
      if (permissions && permissions.length > 0) {
        for (const perm of permissions) {
          await (role as any).createPermission(perm, {
            transaction: t
          })
        }
      }

      await t?.commit()

      // Return updated role with permissions
      const updatedRole = await this.model.findByPk(id, {
        include: {
          model: database.permission
        }
      })

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

      // Prevent deleting Admin role
      if (role.name.toLowerCase() === 'admin') {
        throw new Error('Cannot delete Admin role')
      }

      // Delete permissions first
      await (role as any).permissions?.destroy({ transaction: t })

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
   * Assign role to user
   */
  async assignToUser(...[req, res, next]: [Request, Response, NextFunction]) {
    const { userId, roleId } = req.body
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

      await user.addRole(role, { transaction: t })
      await t?.commit()

      return {
        message: 'Role assigned successfully'
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }
}

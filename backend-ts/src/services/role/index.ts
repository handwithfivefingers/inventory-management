import database from '#/database'
import { RoleStatic } from '#/types/role'
import { NextFunction, Request, Response } from 'express'
import { Sequelize } from 'sequelize'

export class RoleService {
  model: RoleStatic
  sequelize: Sequelize | undefined
  constructor() {
    this.model = database.role
    this.sequelize = database.sequelize
  }
  async create(...[req, res, next]: [Request, Response, NextFunction]) {
    const { name, description, permission } = req.body
    const t = await this.sequelize?.transaction()
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

      if (permission) {
        await (_role as any).createPermission(permission, { transaction: t })
        // await _role.createPermission(permission, { transaction: t })
      }

      await t?.commit()
      return {
        role: _role
      }
    } catch (error) {
      await t?.rollback()
      throw error
    }
  }
  async getRoles() {
    try {
      const _roles = await this.model.findAll({
        include: {
          model: database.permission
        }
      })
      return _roles
    } catch (error) {
      throw error
    }
  }
}

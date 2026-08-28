import database from '#/database'
import { IPermissionStatic } from '#/types/permission'
import { Sequelize } from 'sequelize'

export default class PermissionService {
  model: IPermissionStatic
  sequelize: Sequelize | undefined
  constructor() {
    this.model = database.permission
    this.sequelize = database.sequelize
  }

  /**
   * Get all roles with permissions (filtered by vendor).
   * Permissions are returned in the flat {id,name,C,R,U,D} shape - flags
   * resolved from the role_permissions join table.
   */
  async getPermissions() {
    try {
      const result = await this.model.findAll()
      const response = new Map()
      for (let perm of result) {
        if (response.has(perm.name)) {
          response.set(perm.name, response.get(perm.name).concat({ id: perm.id, method: perm.method }))
          continue
        }
        response.set(perm.name, [{ id: perm.id, method: perm.method }])
      }
      return Array.from(response).map(([name, methods]) => ({ name, methods }))
    } catch (error) {
      throw error
    }
  }
}

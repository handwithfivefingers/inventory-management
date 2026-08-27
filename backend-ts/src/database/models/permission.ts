import { PermissionModel, IPermissionStatic } from '#/types/permission'
import { DataTypes, Sequelize } from 'sequelize'

/**
 * Shared permission CATALOG: one row per canonical module
 * (see #/constant/modules). Holds NO action flags - the per-role C/R/U/D
 * grants live on the `role_permissions` join table (#/database/models/role_permission).
 */
const PermissionModel = (sequelize: Sequelize) => {
  const M = <IPermissionStatic>sequelize.define<PermissionModel>(
    'permission',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.STRING
      }
    },
    {
      timestamps: true,
      tableName: 'permissions'
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.role, {
      through: models.role_permission,
      foreignKey: 'permissionId',
      otherKey: 'roleId'
    })
  }
  return M
}

export default PermissionModel

import { DataTypes, Model, Sequelize } from 'sequelize'

export interface IRolePermissionModel extends Model {
  roleId: number
  permissionId: number
  C: boolean
  R: boolean
  U: boolean
  D: boolean
}

/**
 * Join table between roles and the permission catalog. This is WHERE the
 * per-role C(reate)/R(ead)/U(pdate)/D(elete) grants live - the `permissions`
 * table itself is only a shared catalog of module keys (one row per module,
 * never duplicated per role).
 */
const RolePermissionModel = (sequelize: Sequelize) => {
  const M = sequelize.define<IRolePermissionModel>(
    'role_permission',
    {
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      C: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      R: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      U: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      D: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      timestamps: true,
      tableName: 'role_permissions'
    }
  )

  return M
}

export default RolePermissionModel

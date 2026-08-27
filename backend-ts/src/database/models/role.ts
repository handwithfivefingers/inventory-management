import { RoleModel, RoleStatic } from '#/types/role'
import { DataTypes, Sequelize } from 'sequelize'

const RoleModel = (sequelize: Sequelize) => {
  const M = <RoleStatic>sequelize.define<RoleModel>(
    'role',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.STRING
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      isGlobal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'System default role - cannot be deleted'
      }
    },
    {
      timestamps: true,
      tableName: 'roles'
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.permission, {
      through: models.role_permission,
      foreignKey: 'roleId',
      otherKey: 'permissionId'
    })
    M.hasMany(models.staff, { foreignKey: 'roleId' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }

  return M
}

export default RoleModel

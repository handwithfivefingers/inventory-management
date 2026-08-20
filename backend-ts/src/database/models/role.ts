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
      }
    },
    {
      timestamps: true,
      tableName: 'roles'
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.permission, { through: 'role_permissions' })
    M.belongsToMany(models.user, { through: 'user_role' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }

  return M
}

export default RoleModel

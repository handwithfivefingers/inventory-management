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
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.permission, { through: 'role_permission' }) // Auto Generate role_permission <-> Need to create model for compflex logic
    M.belongsToMany(models.user, { through: 'user_role' }) // Auto Generate user_role <-> Need to create model for compflex logic
  }

  return M
}

export default RoleModel

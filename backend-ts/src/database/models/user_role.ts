import { DataTypes, Sequelize, Model } from 'sequelize'

interface IUserRoleModel extends Model {
  id: number
  userId: number
  roleId: number
  vendorId?: number | null
}

const UserRoleModel = (sequelize: Sequelize) => {
  const M = sequelize.define<IUserRoleModel>(
    'user_role',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // Requirement: a user holds exactly ONE role. Enforced both at the DB
        // level and by replace-semantics in RoleService.assignToUser.
        unique: true
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      timestamps: true,
      tableName: 'user_roles'
    }
  )

  return M
}

export default UserRoleModel

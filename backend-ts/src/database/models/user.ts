import { IUserModel, IUserStatic } from '#/types/user'
import { DataTypes, Sequelize } from 'sequelize'
import bcrypt from 'bcryptjs'

const UserModel = (sequelize: Sequelize) => {
  const M = <IUserStatic>sequelize.define<IUserModel>(
    'user',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: true
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'email'
      },
      password: {
        type: DataTypes.STRING,
        set(value: string) {
          this.setDataValue('password', bcrypt.hashSync(value, 10))
        }
      },
      subscription: {
        type: DataTypes.ENUM,
        values: ['free', 'paid'],
        defaultValue: 'free'
      },
      secret: {
        type: DataTypes.STRING
      },
      parsed: {
        type: DataTypes.VIRTUAL, // Define as a virtual attribute
        get() {
          // The getter logic calculates the value based on other attributes
          return {
            id: this.id,
            nickname: this.nickname,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            subscription: this.subscription,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
          }
        }
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.role, { through: 'user_role' })
    M.hasMany(models.vendor, { foreignKey: 'userId' })
  }
  return M
}

export default UserModel

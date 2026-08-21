import { IStaffModel, IStaffStatic } from '#/types/staff'
import { DataTypes, Sequelize } from 'sequelize'

const StaffModel = (sequelize: Sequelize) => {
  const M = <IStaffStatic>sequelize.define<IStaffModel>(
    'staff',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Employee code, e.g. NV-0001'
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      gender: {
        type: DataTypes.ENUM,
        values: ['male', 'female', 'other'],
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      position: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'other',
        comment: 'manager | cashier | warehouse | sales | other'
      },
      salary: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      hireDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM,
        values: ['active', 'inactive'],
        allowNull: false,
        defaultValue: 'active'
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Optional link to auth user account'
      },
      warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      timestamps: true,
      tableName: 'staff'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.user, { foreignKey: 'userId' })
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
    M.hasMany(models.shift, { foreignKey: 'staffId' })
    M.hasMany(models.financialRecord, { foreignKey: 'staffId' })
  }
  return M
}

export default StaffModel

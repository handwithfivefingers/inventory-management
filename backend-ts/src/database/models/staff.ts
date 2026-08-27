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
        unique: true,
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
      // email: {
      //   type: DataTypes.STRING,
      //   allowNull: true
      // },
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
        comment: 'FK -> users.id (auth account)'
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tenant vendor'
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'FK -> roles.id'
      }
      // warehouseId: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true
      // }
    },
    {
      timestamps: true,
      tableName: 'staff'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.user, { foreignKey: 'userId' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
    M.belongsTo(models.role, { foreignKey: 'roleId' })
    // M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
    // Many
    M.hasMany(models.shift, { foreignKey: 'staffId' })
    M.hasMany(models.financialRecord, { foreignKey: 'staffId' })
  }
  return M
}

export default StaffModel

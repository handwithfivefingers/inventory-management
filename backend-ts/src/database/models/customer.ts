import { ICustomerModel, ICustomerStatic } from '#/types/customer'
import { DataTypes, Sequelize } from 'sequelize'

const CustomerModel = (sequelize: Sequelize) => {
  const M = <ICustomerStatic>sequelize.define<ICustomerModel>(
    'customer',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      taxCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
    M.hasMany(models.invoice, { foreignKey: 'customerId' })
  }

  return M
}

export default CustomerModel

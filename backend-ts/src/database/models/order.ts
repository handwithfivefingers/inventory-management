import { IOrderModel, IOrderStatic } from '#/types/order'
import { DataTypes, Sequelize } from 'sequelize'

const OrderModel = (sequelize: Sequelize) => {
  const M = <IOrderStatic>sequelize.define<IOrderModel>(
    'order',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      VAT: {
        type: DataTypes.INTEGER
      },
      paid: {
        type: DataTypes.BIGINT
      },
      surcharge: {
        type: DataTypes.BIGINT
      },
      price: {
        type: DataTypes.BIGINT
      },
      paymentType: {
        type: DataTypes.ENUM,
        values: ['cash', 'transfer'],
        defaultValue: 'cash'
      },
      providerId: {
        type: DataTypes.INTEGER
      },
      warehouseId: {
        type: DataTypes.INTEGER
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
    M.hasMany(models.orderDetail, { foreignKey: 'orderId' })
    M.belongsTo(models.provider, { foreignKey: 'providerId' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }
  return M
}

export default OrderModel

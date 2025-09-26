import { IOrderDetailModel, IOrderDetailStatic } from '#/types/orderDetail'
import { DataTypes, Sequelize } from 'sequelize'

const OrderDetailModel = (sequelize: Sequelize) => {
  const M = <IOrderDetailStatic>sequelize.define<IOrderDetailModel>(
    'orderDetail',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      quantity: {
        type: DataTypes.INTEGER
      },
      price: {
        type: DataTypes.BIGINT
      },
      buyPrice: {
        type: DataTypes.BIGINT
      },
      note: {
        type: DataTypes.STRING
      },
      warehouseId: {
        type: DataTypes.INTEGER
      },
      productId: {
        type: DataTypes.INTEGER
      },
      orderId: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
  }
  return M
}

export default OrderDetailModel

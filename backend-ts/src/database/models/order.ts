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
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.hasMany(models.orderDetail, { foreignKey: 'orderId' })
    M.belongsTo(models.provider, { foreignKey: 'providerId' })
  }
  return M
}

export default OrderModel

// import {
//   CreationOptional,
//   DataTypes,
//   InferAttributes,
//   InferCreationAttributes,
//   Model,
//   Optional,
//   Sequelize
// } from 'sequelize'

// export type OrderAttr = {
//   id: number
//   VAT: number
//   paid: number
//   surcharge: number
//   price: number
//   paymentType: string
//   providerId: number
// }

// export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
//   declare id: number
//   declare price: number
//   declare VAT: number
//   declare paid: number
//   declare surcharge: number
//   declare paymentType: string
//   declare providerId: number
//   declare createdAt: CreationOptional<Date>
//   declare updatedAt: CreationOptional<Date>

//   declare associate: (models: any) => void
// }

// const orderModel = (sequelize: Sequelize) => {
//   const m = Order.init(
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true
//       },
//       VAT: {
//         type: DataTypes.INTEGER
//       },
//       paid: {
//         type: DataTypes.BIGINT
//       },
//       surcharge: {
//         type: DataTypes.BIGINT
//       },
//       price: {
//         type: DataTypes.BIGINT
//       },
//       paymentType: {
//         type: DataTypes.ENUM,
//         values: ['cash', 'transfer'],
//         defaultValue: 'cash'
//       },
//       providerId: {
//         type: DataTypes.INTEGER
//       },
//       createdAt: DataTypes.DATE,
//       updatedAt: DataTypes.DATE
//     },
//     {
//       sequelize,
//       timestamps: true,
//       tableName: 'order'
//     }
//   )

//   m.associate = (models: any) => {
//     m.hasMany(models.orderDetail, { foreignKey: 'orderId' })
//     m.belongsTo(models.provider, { foreignKey: 'providerId' })
//   }
//   // m.belongsTo(models.provider, { foreignKey: 'providerId' })
//   return m
// }

// // orderModel.belongsTo = (models: any) => {
// //   orderModel.hasMany(models.orderDetail, { foreignKey: 'orderId' })
// //   orderModel.belongsTo(models.provider, { foreignKey: 'providerId' })
// // }
// export default orderModel

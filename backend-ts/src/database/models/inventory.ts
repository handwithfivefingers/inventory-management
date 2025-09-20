// const { DataTypes } = require("sequelize");
// const Inventory = (sequelize) => {
//   const Model = sequelize.define(
//     "inventory",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       quantity: {
//         type: DataTypes.INTEGER,
//       },
//     },
//     {
//       // Other model options go here
//       timestamps: true,
//     }
//   );

//   Model.associate = (models) => {
//     Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
//   };
//   return Model;
// };

// module.exports = Inventory;

import { IInventoryModel, IInventoryStatic } from '#/types/inventory'
import { DataTypes, Sequelize } from 'sequelize'

const InventoryModel = (sequelize: Sequelize) => {
  const M = <IInventoryStatic>sequelize.define<IInventoryModel>(
    'inventory',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      quantity: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    // M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })};
    // M.hasMany(models.orderDetail, { foreignKey: "orderId" });
    // M.belongsTo(models.provider, { foreignKey: "providerId" });
  }
  return M
}

export default InventoryModel

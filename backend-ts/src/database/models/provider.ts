// const { DataTypes } = require("sequelize");
// const Provider = (sequelize) => {
//   const Model = sequelize.define(
//     "provider",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       name: {
//         type: DataTypes.STRING,
//         required: true,
//         allowNull: false,
//       },
//       phone: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       address: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       email: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//     },
//     {
//       timestamps: true,
//     }
//   );

//   Model.associate = (models) => {
//     // Model.hasMany(models.order, { foreignKey: "providerId" });
//     Model.belongsTo(models.vendor, { foreignKey: "vendorId" });
//   };
//   return Model;
// };

// module.exports = Provider;

import { IProviderModel, IProviderStatic } from '#/types/provider'
import { DataTypes, Sequelize } from 'sequelize'

const ProviderModel = (sequelize: Sequelize) => {
  const M = <IProviderStatic>sequelize.define<IProviderModel>(
    'provider',
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
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    // M.belongsToMany(models.permission, { through: 'role_permission' })
    // M.belongsToMany(models.user, { through: 'user_role' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }
  return M
}

export default ProviderModel

// const { DataTypes } = require("sequelize");
// const Permission = (sequelize) => {
//   const Model = sequelize.define(
//     "permission",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       name: {
//         type: DataTypes.STRING,
//       },
//       description: {
//         type: DataTypes.STRING,
//       },
//       C: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: false,
//       },
//       R: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: false,
//       },
//       U: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: false,
//       },
//       D: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: false,
//       },
//     },
//     {
//       // Other model options go here
//       timestamps: true,
//     }
//   );
//   Model.associate = (models) => {
//     Model.belongsToMany(models.role, { through: "role_permission" });
//   };
//   return Model;
// };

// module.exports = Permission;

import { PermissionModel, IPermissionStatic } from '#/types/permission'
import { DataTypes, Sequelize } from 'sequelize'

const PermissionModel = (sequelize: Sequelize) => {
  const M = <IPermissionStatic>sequelize.define<PermissionModel>(
    'permission',
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
      C: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      R: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      U: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      D: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.role, { through: 'role_permission' })
  }
  return M
}

export default PermissionModel

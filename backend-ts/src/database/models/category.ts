// const { DataTypes } = require("sequelize");
// const Category = (sequelize) => {
//   const Model = sequelize.define(
//     "category",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//     },
//     {
//       timestamps: true,
//     }
//   );
//   Model.associate = (models) => {
//     Model.belongsToMany(models.product, { through: "product_category" });
//   };
//   return Model;
// };

// module.exports = Category;

import { ICategoryModel, ICategoryStatic } from '#/types/category'
import { DataTypes, Sequelize } from 'sequelize'

const CategoryModel = (sequelize: Sequelize) => {
  const M = <ICategoryStatic>sequelize.define<ICategoryModel>(
    'category',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    // M.belongsToMany(models.product, { through: "product_category" });
  }
  return M
}

export default CategoryModel

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
      },
      vendorId: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.product, { through: 'product_category' })
  }
  return M
}

export default CategoryModel

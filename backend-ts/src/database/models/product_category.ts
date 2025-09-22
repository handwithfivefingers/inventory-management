// categoryId: ForeignKey<number>
// productId: ForeignKey<number>
// createdAt: CreationOptional<Date>
// updatedAt: CreationOptional<Date>
import { IProductCategoryModel, IProductCategoryStatic } from '#/types/product_category'
import { DataTypes, Sequelize } from 'sequelize'

const ProductCategory = (sequelize: Sequelize) => {
  const M = <IProductCategoryStatic>sequelize.define<IProductCategoryModel>(
    'product_category', // reflect to table name product_categories
    {
      categoryId: {
        type: DataTypes.INTEGER
      },
      productId: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.belongsTo(models.category, { foreignKey: 'categoryId' })
  }
  return M
}

export default ProductCategory

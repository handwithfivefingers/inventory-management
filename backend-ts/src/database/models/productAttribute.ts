import { IProductAttributeModel, IProductAttributeStatic } from '#/types/productAttribute'
import { DataTypes, Sequelize } from 'sequelize'

const ProductAttributeModel = (sequelize: Sequelize) => {
  const M = <IProductAttributeStatic>sequelize.define<IProductAttributeModel>(
    'productAttribute',
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
      productId: DataTypes.INTEGER
    },
    {
      timestamps: true,
      tableName: 'productAttributes'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.hasMany(models.productAttributeValue, { foreignKey: 'attributeId', as: 'values' })
  }
  return M
}

export default ProductAttributeModel

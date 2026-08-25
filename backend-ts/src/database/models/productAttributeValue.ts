import {
  IProductAttributeModel,
  IProductAttributeValueModel,
  IProductAttributeValueStatic
} from '#/types/productAttribute'
import { DataTypes, Sequelize } from 'sequelize'

const ProductAttributeValueModel = (sequelize: Sequelize) => {
  const M = <IProductAttributeValueStatic>sequelize.define<IProductAttributeValueModel>(
    'productAttributeValue',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false
      },
      attributeId: DataTypes.INTEGER,
      productId: DataTypes.INTEGER
    },
    {
      timestamps: true,
      tableName: 'productAttributeValues',
      indexes: [
        {
          unique: true,
          fields: ['attributeId', 'value']
        }
      ]
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.belongsTo(models.productAttribute, { foreignKey: 'attributeId' })
    M.belongsToMany(models.productVariant, {
      through: 'product_variant_attribute_values',
      foreignKey: 'attributeValueId',
      otherKey: 'variantId'
    })
  }
  return M
}

export default ProductAttributeValueModel

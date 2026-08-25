import { IProductVariantModel, IProductVariantStatic } from '#/types/productVariant'
import { DataTypes, Sequelize } from 'sequelize'

const ProductVariantModel = (sequelize: Sequelize) => {
  const M = <IProductVariantStatic>sequelize.define<IProductVariantModel>(
    'productVariant',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      skuCode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      // Prices are nullable: when missing the parent product's price applies
      salePrice: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      regularPrice: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      wholeSalePrice: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      costPrice: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      sold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Per-variant "allow negative stock" flag; overrides the parent
      // product's isNegative for this specific combination.
      isNegative: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      timestamps: true,
      tableName: 'productVariants',
      indexes: [
        {
          unique: true,
          fields: ['productId', 'skuCode']
        }
      ]
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.hasMany(models.inventory, { foreignKey: 'variantId' })
    M.hasMany(models.transfer, { foreignKey: 'variantId' })
    M.belongsToMany(models.productAttributeValue, {
      through: 'product_variant_attribute_values',
      foreignKey: 'variantId',
      otherKey: 'attributeValueId',
      as: 'attributeValues'
    })
  }
  return M
}

export default ProductVariantModel

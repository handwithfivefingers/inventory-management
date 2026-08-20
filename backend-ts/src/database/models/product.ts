import { IProductModel, IProductStatic } from '#/types/product'
import { DataTypes, Sequelize } from 'sequelize'

const ProductModel = (sequelize: Sequelize) => {
  const M = <IProductStatic>sequelize.define<IProductModel>(
    'product',
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
      code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      skuCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
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
      unitId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },

    {
      timestamps: true,
      tableName: 'products'
    }
  )

  M.associate = (models: any) => {
    M.belongsToMany(models.category, { through: 'product_category' })
    M.hasMany(models.inventory, { foreignKey: 'productId' })
    M.hasMany(models.orderDetail, { foreignKey: 'productId' })
    M.hasMany(models.transfer, { foreignKey: 'productId' })
    M.belongsToMany(models.tag, { through: 'product_tags' })
    M.belongsTo(models.unit, { foreignKey: 'unitId' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }
  return M
}

export default ProductModel

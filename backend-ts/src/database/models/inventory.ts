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
      },
      productId: DataTypes.INTEGER,
      // Nullable: NULL means product-level (simple product) stock,
      // a value targets one specific variant of the product.
      variantId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      warehouseId: DataTypes.INTEGER
    },
    {
      timestamps: true,
      tableName: 'inventories'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
    M.belongsTo(models.product, { foreignKey: 'productId' })
    M.belongsTo(models.productVariant, { foreignKey: 'variantId' })
  }
  return M
}

export default InventoryModel

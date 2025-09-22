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
      warehouseId: DataTypes.INTEGER
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
  }
  return M
}

export default InventoryModel

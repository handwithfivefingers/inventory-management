import { ITransferModel, ITransferStatic } from '#/types/transfer'
import { DataTypes, Sequelize } from 'sequelize'

const Transfer = (sequelize: Sequelize) => {
  const Model = <ITransferStatic>sequelize.define<ITransferModel>(
    'transfer',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      quantity: {
        type: DataTypes.INTEGER
      },
      type: {
        type: DataTypes.ENUM,
        values: ['0', '1'],
        comment: '0: IN, 1: OUT (legacy)',
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fromWarehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      toWarehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      productId: DataTypes.INTEGER,
      // Nullable: NULL is a legacy/simple-product movement,
      // a value points at the specific variant moved.
      variantId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      timestamps: true,
      tableName: 'transfers'
    }
  )

  Model.associate = (models) => {
    Model.belongsTo(models.warehouse, { foreignKey: 'fromWarehouseId', as: 'fromWarehouse' })
    Model.belongsTo(models.warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' })
    Model.belongsTo(models.product, { foreignKey: 'productId' })
    Model.belongsTo(models.productVariant, { foreignKey: 'variantId' })
  }
  return Model
}

module.exports = Transfer

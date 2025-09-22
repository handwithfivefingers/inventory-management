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
        comment: '0: IN, 1: OUT',
        allowNull: false
      },
      warehouseId: DataTypes.INTEGER,
      productId: DataTypes.INTEGER,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      timestamps: true
    }
  )

  Model.associate = (models) => {
    // Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
    Model.belongsTo(models.product, { foreignKey: 'productId' })
  }
  return Model
}

module.exports = Transfer

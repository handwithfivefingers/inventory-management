import { IWarehouseModel, IWarehouseStatic } from '#/types/warehouse'
import { DataTypes, Sequelize } from 'sequelize'

const Warehouse = (sequelize: Sequelize) => {
  const Model = <IWarehouseStatic>sequelize.define<IWarehouseModel>(
    'warehouse',
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
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isMain: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      vendorId: {
        type: DataTypes.INTEGER
      }
    },
    {
      // Other model options go here
      timestamps: true
    }
  )
  Model.associate = (models) => {
    Model.hasMany(models.inventory, { foreignKey: 'warehouseId' })
    Model.hasMany(models.orderDetail, { foreignKey: 'warehouseId' })
    Model.hasMany(models.transfer, { foreignKey: 'warehouseId' })
    Model.hasMany(models.order, { foreignKey: 'warehouseId' })
  }
  return Model
}

export default Warehouse

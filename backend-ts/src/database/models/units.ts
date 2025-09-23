import { IUnitModel, IUnitStatic } from '#/types/unit'
import { DataTypes, Sequelize } from 'sequelize'

const Unit = (sequelize: Sequelize) => {
  const Model = <IUnitStatic>sequelize.define<IUnitModel>(
    'unit',
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
      vendorId: DataTypes.INTEGER
    },
    {
      timestamps: true
    }
  )
  Model.associate = (models) => {}
  return Model
}

export default Unit

import { IVendorModel, IVendorStatic } from '#/types/vendor'
import { DataTypes, Sequelize } from 'sequelize'

const VendorModel = (sequelize: Sequelize) => {
  const M = <IVendorStatic>sequelize.define<IVendorModel>(
    'vendor',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING
      },
      userId: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.hasMany(models.warehouse, { foreignKey: 'vendorId' })
    M.hasMany(models.category, { foreignKey: 'vendorId' })
    M.hasMany(models.tag, { foreignKey: 'vendorId' })
    M.hasMany(models.unit, { foreignKey: 'vendorId' })
    // M.belongsTo(models.user, { foreignKey: 'userId' })
  }
  return M
}

export default VendorModel

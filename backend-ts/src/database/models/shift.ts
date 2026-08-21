import { IShiftModel, IShiftStatic } from '#/types/shift'
import { DataTypes, Sequelize } from 'sequelize'

const ShiftModel = (sequelize: Sequelize) => {
  const M = <IShiftStatic>sequelize.define<IShiftModel>(
    'shift',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Shift code, e.g. CA-0001'
      },
      staffId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Staff who opens the shift'
      },
      openTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      closeTime: {
        type: DataTypes.DATE,
        allowNull: true
      },
      openingCash: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Cash in drawer at shift open'
      },
      closingCash: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Cash counted at shift close'
      },
      expectedCash: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Expected cash = opening + system revenue'
      },
      actualCash: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Actual cash counted'
      },
      difference: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'actualCash - expectedCash'
      },
      status: {
        type: DataTypes.ENUM,
        values: ['open', 'closed'],
        allowNull: false,
        defaultValue: 'open'
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true
      },
      warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      timestamps: true,
      tableName: 'shifts'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.staff, { foreignKey: 'staffId' })
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
  }
  return M
}

export default ShiftModel

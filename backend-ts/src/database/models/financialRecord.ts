import { IFinancialRecordModel, IFinancialRecordStatic } from '#/types/financialRecord'
import { DataTypes, Sequelize } from 'sequelize'

const FinancialRecordModel = (sequelize: Sequelize) => {
  const M = <IFinancialRecordStatic>sequelize.define<IFinancialRecordModel>(
    'financialRecord',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Voucher code, e.g. PT-00001 (revenue) / PC-00001 (expense)'
      },
      type: {
        type: DataTypes.ENUM,
        values: ['revenue', 'expense'],
        allowNull: false,
        comment: 'revenue: phiếu thu, expense: phiếu chi'
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'other',
        comment: 'sale | import | salary | rent | other'
      },
      amount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true
      },
      relatedType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'order | importOrder | shift'
      },
      relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      staffId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      transactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      timestamps: true,
      tableName: 'financial_records'
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.staff, { foreignKey: 'staffId' })
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
  }
  return M
}

export default FinancialRecordModel

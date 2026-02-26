import { IInvoiceDetailModel, IInvoiceDetailStatic } from '#/types/invoiceDetail'
import { DataTypes, Sequelize } from 'sequelize'

const InvoiceDetailModel = (sequelize: Sequelize) => {
  const M = <IInvoiceDetailStatic>sequelize.define<IInvoiceDetailModel>(
    'invoiceDetail',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      unitPrice: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      discount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      taxRate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: DataTypes.BIGINT,
        allowNull: false
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.invoice, { foreignKey: 'invoiceId' })
    M.belongsTo(models.product, { foreignKey: 'productId' })
  }

  return M
}

export default InvoiceDetailModel

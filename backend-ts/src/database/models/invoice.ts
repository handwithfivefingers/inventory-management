import { IInvoiceModel, IInvoiceStatic } from '#/types/invoice'
import { DataTypes, Sequelize } from 'sequelize'

const InvoiceModel = (sequelize: Sequelize) => {
  const M = <IInvoiceStatic>sequelize.define<IInvoiceModel>(
    'invoice',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      invoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      subtotal: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      discount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      VAT: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      taxAmount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      surcharge: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      paid: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      remaining: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'VND'
      },
      paymentType: {
        type: DataTypes.ENUM('cash', 'transfer', 'credit'),
        allowNull: false,
        defaultValue: 'cash'
      },
      status: {
        type: DataTypes.ENUM('draft', 'issued', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  )

  M.associate = (models: any) => {
    M.belongsTo(models.order, { foreignKey: 'orderId' })
    M.belongsTo(models.customer, { foreignKey: 'customerId' })
    M.belongsTo(models.vendor, { foreignKey: 'vendorId' })
    M.belongsTo(models.warehouse, { foreignKey: 'warehouseId' })
    M.hasMany(models.invoiceDetail, { foreignKey: 'invoiceId' })
  }

  return M
}

export default InvoiceModel

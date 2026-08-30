import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Invoice } from './invoice'
import { Product } from './product'

@Table({ tableName: 'invoiceDetails', modelName: 'invoiceDetail', timestamps: true })
export class InvoiceDetail extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Invoice)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare invoiceId: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare productId: number | null

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare quantity: number

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare unitPrice: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare discount: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare taxRate: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare taxAmount: number

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare subtotal: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Invoice, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare invoice: Invoice

  @BelongsTo(() => Product, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare product: Product
}

export default InvoiceDetail

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Invoice } from './invoice'
import { Product } from './product'
import { OrderDetail } from './orderDetail'
import { ProductVariant } from './productVariant'

@Table({ tableName: 'invoiceDetails', modelName: 'invoiceDetail', timestamps: true })
export class InvoiceDetail extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Invoice)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare invoiceId: number

  @ForeignKey(() => OrderDetail)
  @Column({ type: DataType.INTEGER, allowNull: true, comment: '1 orderDetail -> N invoiceDetails; each invoiceDetail belongs to exactly 1 orderDetail' })
  declare orderDetailId: number | null

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare productId: number | null

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare variantId: number

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

  @BelongsTo(() => OrderDetail, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare orderDetail: OrderDetail

  @BelongsTo(() => Product, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare product: Product

  @BelongsTo(() => ProductVariant, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  declare variant: ProductVariant
}

export default InvoiceDetail

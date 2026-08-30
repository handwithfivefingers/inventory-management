import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Order } from './order'
import { Customer } from './customer'
import { Vendor } from './vendor'
import { Warehouse } from './warehouse'
import { InvoiceDetail } from './invoiceDetail'

@Table({ tableName: 'invoices', modelName: 'invoice', timestamps: true })
export class Invoice extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  declare invoiceNumber: string

  @ForeignKey(() => Order)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare orderId: number | null

  @ForeignKey(() => Customer)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare customerId: number | null

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare warehouseId: number | null

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare subtotal: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare discount: number

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare VAT: number | null

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare taxAmount: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare surcharge: number

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare total: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare paid: number

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare remaining: number

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'VND' })
  declare currency: string

  @Column({ type: DataType.ENUM('cash', 'transfer', 'credit'), allowNull: false, defaultValue: 'cash' })
  declare paymentType: 'cash' | 'transfer' | 'credit'

  @Column({ type: DataType.ENUM('draft', 'issued', 'paid', 'cancelled'), allowNull: false, defaultValue: 'draft' })
  declare status: 'draft' | 'issued' | 'paid' | 'cancelled'

  @Column({ type: DataType.DATE, allowNull: true })
  declare dueDate: Date | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Order, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare order: Order

  @BelongsTo(() => Customer, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare customer: Customer

  @BelongsTo(() => Vendor, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare vendor: Vendor

  @BelongsTo(() => Warehouse, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse

  @HasMany(() => InvoiceDetail)
  declare invoiceDetails: InvoiceDetail[]
}

export default Invoice

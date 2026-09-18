import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany
} from 'sequelize-typescript'
import { Order } from './order'
import { Product } from './product'
import { Warehouse } from './warehouse'
import { ProductVariant } from './productVariant'
import { InvoiceDetail } from './invoiceDetail'
import { ProductBarcode } from './productBarcode'

@Table({ tableName: 'orderDetails', modelName: 'orderDetail', timestamps: true })
export class OrderDetail extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.INTEGER)
  declare quantity: number

  @Column(DataType.BIGINT)
  declare price: number

  @Column(DataType.BIGINT)
  declare buyPrice: number

  @Column(DataType.STRING)
  declare note: string

  @ForeignKey(() => Warehouse)
  @Column(DataType.INTEGER)
  declare warehouseId: number

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare variantId: number

  /** The scanned selling unit. Nullable only for legacy order rows. */
  @ForeignKey(() => ProductBarcode)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare barcodeId: number | null

  /** Immutable sale snapshots; never recalculate old invoices from current barcode pricing. */
  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  declare priceAtSale: string | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare conversionRateAtSale: number | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare unitNameAtSale: string | null

  @ForeignKey(() => Order)
  @Column(DataType.INTEGER)
  declare orderId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare order: Order

  @BelongsTo(() => Product, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare product: Product

  @BelongsTo(() => Warehouse, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse

  @BelongsTo(() => ProductVariant, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  declare variant: ProductVariant

  @BelongsTo(() => ProductBarcode, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  declare barcode: ProductBarcode

  @HasMany(() => InvoiceDetail)
  declare invoiceDetails: InvoiceDetail[]
}

export default OrderDetail

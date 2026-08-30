import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Order } from './order'
import { Product } from './product'
import { Warehouse } from './warehouse'
import { ProductVariant } from './productVariant'

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
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare variantId: number | null

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

  @BelongsTo(() => ProductVariant, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare variant: ProductVariant
}

export default OrderDetail

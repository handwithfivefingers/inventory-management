import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Provider } from './provider'
import { Vendor } from './vendor'
import { Warehouse } from './warehouse'
import { OrderDetail } from './orderDetail'

@Table({ tableName: 'orders', modelName: 'order', timestamps: true })
export class Order extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare code: string | null

  @Column(DataType.INTEGER)
  declare VAT: number

  @Column(DataType.BIGINT)
  declare paid: number

  @Column(DataType.BIGINT)
  declare surcharge: number

  @Column(DataType.BIGINT)
  declare price: number

  @Column({ type: DataType.ENUM('cash', 'transfer', 'credit'), defaultValue: 'cash' })
  declare paymentType: string

  @ForeignKey(() => Provider)
  @Column(DataType.INTEGER)
  declare providerId: number

  @ForeignKey(() => Warehouse)
  @Column(DataType.INTEGER)
  declare warehouseId: number

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @HasMany(() => OrderDetail)
  declare orderDetails: OrderDetail[]

  @BelongsTo(() => Provider)
  declare provider: Provider

  @BelongsTo(() => Warehouse)
  declare warehouse: Warehouse

  @BelongsTo(() => Vendor)
  declare vendor: Vendor
}

export default Order

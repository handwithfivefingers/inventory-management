import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript'
import { Order } from './order'
import { Staff } from './staff'
import { Warehouse } from './warehouse'

/**
 * Return document for a sale order. One row per return event. The returned
 * lines are snapshotted in `items` (productId, variantId, quantity, price) so
 * the document stays an immutable record even if the order is edited later.
 * Stock for returned goods flows back through corrective Transfers (IN) and
 * the refund money is booked as an expense FinancialRecord.
 */
@Table({ tableName: 'order_returns', modelName: 'orderReturn', timestamps: true })
export class OrderReturn extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  /** Human readable return code, e.g. RET-20260912-0001 */
  @Column({ type: DataType.STRING, allowNull: false })
  declare code: string

  @ForeignKey(() => Order)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare orderId: number

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare warehouseId: number | null

  @ForeignKey(() => Staff)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare staffId: number | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  /** Snapshot: [{ productId, variantId, name, quantity, price }] */
  @Column({ type: DataType.TEXT })
  declare items: string

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare refundAmount: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare reason: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare order: Order

  @BelongsTo(() => Warehouse, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse

  @BelongsTo(() => Staff, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare staff: Staff
}

export default OrderReturn

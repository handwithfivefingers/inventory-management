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
import { Staff } from './staff'
import { Warehouse } from './warehouse'
import { StocktakeDetail } from './stocktakeDetail'

/**
 * Stocktake (đồng kiểm kho) session for one warehouse.
 * Lifecycle:
 *  - start(): snapshots expected quantities from `inventories` into details
 *  - update lines: record `actualQuantity` (+ note) per product/variant
 *  - complete(): every variance becomes a corrective Transfer + inventory
 *    update, exactly like manual stock corrections, so the movement history
 *    stays auditable.
 */
@Table({ tableName: 'stocktakes', modelName: 'stocktake', timestamps: true })
export class Stocktake extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare code: string

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare warehouseId: number

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @ForeignKey(() => Staff)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare staffId: number | null
  @Column({
    type: DataType.ENUM('open', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'open'
  })
  declare status: string

  @Column({ type: DataType.TEXT, allowNull: true })
  declare note: string | null

  /** Set when the session is completed */
  @Column({ type: DataType.DATE, allowNull: true })
  declare completedAt: Date | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Warehouse, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse

  @BelongsTo(() => Staff, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare staff: Staff

  @HasMany(() => StocktakeDetail, { foreignKey: 'stocktakeId', as: 'stocktakeDetails' })
  declare stocktakeDetails: StocktakeDetail[]
}

export default Stocktake

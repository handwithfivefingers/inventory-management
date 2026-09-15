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
import { Product } from './product'
import { ProductVariant } from './productVariant'
import { Stocktake } from './stocktake'

/**
 * One counted line of a stocktake session. `expectedQuantity` is snapshotted
 * from inventories when the session starts; `actualQuantity` is what the
 * counter physically found. The variance (actual - expected) is applied to
 * inventory when the session completes.
 */
@Table({ tableName: 'stocktake_details', modelName: 'stocktakeDetail', timestamps: true })
export class StocktakeDetail extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Stocktake)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare stocktakeId: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare productId: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare variantId: number | null

  /** Snapshot of inventory quantity when the session started */
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare expectedQuantity: number

  /** Physical count; NULL = not counted yet */
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare actualQuantity: number | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare note: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Stocktake, { foreignKey: 'stocktakeId', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare stocktake: Stocktake

  @BelongsTo(() => Product, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare product: Product

  @BelongsTo(() => ProductVariant, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare variant: ProductVariant
}

export default StocktakeDetail

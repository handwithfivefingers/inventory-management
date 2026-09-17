import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Warehouse } from './warehouse'
import { Product } from './product'
import { ProductVariant } from './productVariant'

@Table({
  tableName: 'inventories',
  modelName: 'inventory',
  timestamps: true,
  indexes: [
    // Unified search joins stock per (variant, warehouse) for POS exact/scan reads.
    { fields: ['variantId', 'warehouseId'] },
    { fields: ['productId'] },
    { fields: ['warehouseId'] }
  ]
})
export class Inventory extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.INTEGER)
  declare quantity: number

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare variantId: number

  @ForeignKey(() => Warehouse)
  @Column(DataType.INTEGER)
  declare warehouseId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Warehouse, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse

  @BelongsTo(() => Product, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare product: Product

  @BelongsTo(() => ProductVariant, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  declare variant: ProductVariant
}

export default Inventory

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Warehouse } from './warehouse'
import { Product } from './product'
import { ProductVariant } from './productVariant'

@Table({ tableName: 'inventories', modelName: 'inventory', timestamps: true })
export class Inventory extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.INTEGER)
  declare quantity: number

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare variantId: number | null

  @ForeignKey(() => Warehouse)
  @Column(DataType.INTEGER)
  declare warehouseId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Warehouse)
  declare warehouse: Warehouse

  @BelongsTo(() => Product)
  declare product: Product

  @BelongsTo(() => ProductVariant)
  declare variant: ProductVariant
}

export default Inventory

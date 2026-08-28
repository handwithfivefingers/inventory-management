import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Warehouse } from './warehouse'
import { Product } from './product'
import { ProductVariant } from './productVariant'

@Table({ tableName: 'transfers', modelName: 'transfer', timestamps: true })
export class Transfer extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.INTEGER)
  declare quantity: number

  @Column({ type: DataType.ENUM('0', '1'), allowNull: true, comment: '0: IN, 1: OUT (legacy)' })
  declare type: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare status: string | null

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare fromWarehouseId: number | null

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare toWarehouseId: number | null

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare variantId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Warehouse, { foreignKey: 'fromWarehouseId', as: 'fromWarehouse' })
  declare fromWarehouse: Warehouse

  @BelongsTo(() => Warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' })
  declare toWarehouse: Warehouse

  @BelongsTo(() => Product)
  declare product: Product

  @BelongsTo(() => ProductVariant)
  declare variant: ProductVariant
}

export default Transfer

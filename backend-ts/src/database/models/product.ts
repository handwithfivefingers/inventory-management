import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany, BelongsToMany } from 'sequelize-typescript'
import { Category } from './category'
import { ProductCategory } from './product_category'
import { Tag } from './tag'
import { ProductVariant } from './productVariant'
import { ProductAttribute } from './productAttribute'
import { Inventory } from './inventory'
import { OrderDetail } from './orderDetail'
import { Transfer } from './transfer'
import { Unit } from './units'
import { Vendor } from './vendor'

@Table({ tableName: 'products', modelName: 'product', timestamps: true })
export class Product extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare code: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare skuCode: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare description: string | null

  @Column({ type: DataType.BIGINT, allowNull: true })
  declare salePrice: number | null

  @Column({ type: DataType.BIGINT, allowNull: true })
  declare regularPrice: number | null

  @Column({ type: DataType.BIGINT, allowNull: true })
  declare wholeSalePrice: number | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare costPrice: number | null

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  declare sold: number

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isNegative: boolean

  @Column({ type: DataType.STRING, allowNull: true })
  declare image: string | null

  @ForeignKey(() => Unit)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare unitId: number | null

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsToMany(() => Category, () => ProductCategory)
  declare categories: Category[]

  @HasMany(() => Inventory)
  declare inventories: Inventory[]

  @HasMany(() => OrderDetail)
  declare orderDetails: OrderDetail[]

  @HasMany(() => Transfer)
  declare transfers: Transfer[]

  @BelongsToMany(() => Tag, { through: 'product_tags', foreignKey: 'productId', otherKey: 'tagId' })
  declare tags: Tag[]

  @HasMany(() => ProductVariant, { foreignKey: 'productId', as: 'variants' })
  declare variants: ProductVariant[]

  @HasMany(() => ProductAttribute, { foreignKey: 'productId', as: 'attributes' })
  declare attributes: ProductAttribute[]

  @BelongsTo(() => Unit)
  declare unit: Unit

  @BelongsTo(() => Vendor)
  declare vendor: Vendor
}

export default Product

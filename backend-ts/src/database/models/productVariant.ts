import {
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import { Inventory } from './inventory'
import { Product } from './product'
import ProductAttribute from './productAttribute'
import { Transfer } from './transfer'
import ProductAttributeValue from './productAttributeValue'

@Table({
  tableName: 'productVariants',
  modelName: 'productVariant',
  timestamps: true,
  indexes: [{ unique: true, fields: ['productId', 'skuCode'] }]
})
export class ProductVariant extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare productId: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare code: string | null

  @Column({ type: DataType.STRING, allowNull: false })
  declare skuCode: string

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

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isNegative: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare product: Product

  @HasMany(() => Inventory)
  declare inventories: Inventory[]

  @HasMany(() => Transfer)
  declare transfers: Transfer[]

  @BelongsToMany(() => ProductAttributeValue, {
    through: 'productVariantAttributeValues',
    foreignKey: 'variantId',
    otherKey: 'attributeValueId'
  })
  declare attributeValues: ProductAttributeValue[]
}

export default ProductVariant

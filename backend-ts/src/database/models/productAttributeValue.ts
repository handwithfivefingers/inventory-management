import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript'
import { Product } from './product'
import { ProductAttribute } from './productAttribute'
import { ProductVariant } from './productVariant'

@Table({
  tableName: 'productAttributeValues',
  modelName: 'productAttributeValue',
  timestamps: true,
  indexes: [{ unique: true, fields: ['attributeId', 'value'] }]
})
export class ProductAttributeValue extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare value: string

  @ForeignKey(() => ProductAttribute)
  @Column(DataType.INTEGER)
  declare attributeId: number

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Product)
  declare product: Product

  @BelongsTo(() => ProductAttribute)
  declare attribute: ProductAttribute

  @BelongsToMany(() => ProductVariant, { through: 'product_variant_attribute_values', foreignKey: 'attributeValueId', otherKey: 'variantId' })
  declare variants: ProductVariant[]
}

export default ProductAttributeValue

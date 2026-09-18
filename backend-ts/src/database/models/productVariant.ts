import {
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  ForeignKey,
  HasMany,
  Model,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import { Inventory } from './inventory'
import { Product } from './product'
import { Transfer } from './transfer'
import ProductAttributeValue from './productAttributeValue'

@Table({
  tableName: 'productVariants',
  modelName: 'productVariant',
  timestamps: true,
  paranoid: true,
  indexes: [
    { unique: true, fields: ['productId', 'skuCode'] },
    // Unified search (exact scan + POS/ADMIN fallback) filters/sorts on these.
    { fields: ['skuCode'] },
    { fields: ['code'] },
    { fields: ['productId'] }
  ]
})
export class ProductVariant extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare productId: number

  @Column({
    type: DataType.STRING(12),
    allowNull: true,
    validate: {
      len: {
        args: [1, 12],
        msg: 'code must contain only letters, digits, and hyphens and be at most 12 characters'
      },
      is: {
        args: /^[A-Za-z0-9-]+$/,
        msg: 'code must contain only letters, digits, and hyphens'
      }
    }
  })
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

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'VAT percent, source of truth (parent product VAT removed)'
  })
  declare VAT: number | null

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  declare sold: number

  @Column({ type: DataType.STRING, allowNull: true, comment: 'Variant-level image (migrated from products.image)' })
  declare imageUrl: string | null

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isNegative: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @DeletedAt
  @Column({ type: DataType.DATE, allowNull: true })
  declare deletedAt: Date | null

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

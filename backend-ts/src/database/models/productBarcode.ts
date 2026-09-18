import {
  BeforeValidate,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import { OrderDetail } from './orderDetail'
import { ProductVariant } from './productVariant'
import { Unit } from './units'

@Table({
  tableName: 'product_barcodes',
  modelName: 'productBarcode',
  timestamps: true,
  indexes: [{ unique: true, fields: ['barcode'] }, { fields: ['variantId'] }, { fields: ['unitId'] }]
})
export class ProductBarcode extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare variantId: number

  @ForeignKey(() => Unit)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare unitId: number

  @Column({ type: DataType.STRING(64), allowNull: false, unique: true })
  declare barcode: string

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  declare conversionRate: number

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  declare costPrice: string

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  declare retailPrice: string

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  declare wholesalePrice: string

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  declare promoPrice: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare promoStartAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare promoEndAt: Date | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => ProductVariant, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  declare variant: ProductVariant

  @BelongsTo(() => Unit, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  declare unit: Unit

  @HasMany(() => OrderDetail)
  declare orderDetails: OrderDetail[]

  @BeforeValidate
  static validateBusinessRules(row: ProductBarcode) {
    const conversionRate = Number(row.conversionRate)
    const costPrice = Number(row.costPrice)
    const retailPrice = Number(row.retailPrice)
    const wholesalePrice = Number(row.wholesalePrice)
    const promoPrice = row.promoPrice === null || row.promoPrice === undefined ? null : Number(row.promoPrice)

    if (!Number.isInteger(conversionRate) || conversionRate <= 0) {
      throw new Error('conversionRate must be a positive integer')
    }
    if (retailPrice < costPrice) throw new Error('retailPrice must be greater than or equal to costPrice')
    if (wholesalePrice > retailPrice) throw new Error('wholesalePrice must be less than or equal to retailPrice')
    if (promoPrice !== null && promoPrice >= retailPrice) throw new Error('promoPrice must be less than retailPrice')
  }
}

export default ProductBarcode

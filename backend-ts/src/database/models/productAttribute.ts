import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Product } from './product'
import { ProductAttributeValue } from './productAttributeValue'

@Table({ tableName: 'productAttributes', modelName: 'productAttribute', timestamps: true })
export class ProductAttribute extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare product: Product

  @HasMany(() => ProductAttributeValue)
  declare values: ProductAttributeValue[]
}

export default ProductAttribute

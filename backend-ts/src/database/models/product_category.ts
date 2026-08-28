import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Product } from './product'
import { Category } from './category'

@Table({ tableName: 'product_categories', modelName: 'product_category', timestamps: true })
export class ProductCategory extends Model {
  @ForeignKey(() => Category)
  @Column(DataType.INTEGER)
  declare categoryId: number

  @ForeignKey(() => Product)
  @Column(DataType.INTEGER)
  declare productId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Product)
  declare product: Product

  @BelongsTo(() => Category)
  declare category: Category
}

export default ProductCategory

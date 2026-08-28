import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsToMany } from 'sequelize-typescript'
import { Vendor } from './vendor'
import { Product } from './product'
import { ProductCategory } from './product_category'

@Table({ tableName: 'categories', modelName: 'category', timestamps: true })
export class Category extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare code: string | null

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @ForeignKey(() => Vendor)
  @Column(DataType.INTEGER)
  declare vendorId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsToMany(() => Product, () => ProductCategory)
  declare products: Product[]
}

export default Category

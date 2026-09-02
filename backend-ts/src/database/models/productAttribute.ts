import { Column, CreatedAt, DataType, ForeignKey, HasMany, Model, Table, UpdatedAt } from 'sequelize-typescript'
import { ProductAttributeValue } from './productAttributeValue'
import Vendor from './vendor'

@Table({ tableName: 'productAttributes', modelName: 'productAttribute', timestamps: true })
export class ProductAttribute extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @HasMany(() => ProductAttributeValue)
  declare values: ProductAttributeValue[]
}

export default ProductAttribute

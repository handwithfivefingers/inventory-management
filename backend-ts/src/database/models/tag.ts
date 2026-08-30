import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript'
import { Vendor } from './vendor'
import { Product } from './product'

@Table({ tableName: 'tags', modelName: 'tag', timestamps: true })
export class Tag extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @ForeignKey(() => Vendor)
  @Column(DataType.INTEGER)
  declare vendorId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare vendor: Vendor

  @BelongsToMany(() => Product, { through: 'product_tags', foreignKey: 'tagId', otherKey: 'productId' })
  declare products: Product[]
}

export default Tag

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Vendor } from './vendor'

@Table({ tableName: 'units', modelName: 'unit', timestamps: true })
export class Unit extends Model {
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

  @BelongsTo(() => Vendor)
  declare vendor: Vendor
}

export default Unit

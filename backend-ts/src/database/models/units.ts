import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Vendor } from './vendor'

@Table({ tableName: 'units', modelName: 'unit', timestamps: true })
export class Unit extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  /** The vendor-owned unit assigned to every newly-created base barcode. */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isDefault: boolean

  @ForeignKey(() => Vendor)
  @Column(DataType.INTEGER)
  declare vendorId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'NO ACTION', onUpdate: 'RESTRICT' })
  declare vendor: Vendor

}

export default Unit

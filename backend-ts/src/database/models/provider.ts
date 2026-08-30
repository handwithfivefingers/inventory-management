import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Vendor } from './vendor'

@Table({ tableName: 'providers', modelName: 'provider', timestamps: true })
export class Provider extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.STRING)
  declare name: string

  @Column(DataType.STRING)
  declare description: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null

  @ForeignKey(() => Vendor)
  @Column(DataType.INTEGER)
  declare vendorId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  declare vendor: Vendor
}

export default Provider

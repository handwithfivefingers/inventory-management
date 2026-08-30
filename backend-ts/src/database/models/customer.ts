import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Vendor } from './vendor'
import { Invoice } from './invoice'

@Table({ tableName: 'customers', modelName: 'customer', timestamps: true })
export class Customer extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare code: string | null

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare taxCode: string | null

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare vendor: Vendor

  @HasMany(() => Invoice)
  declare invoices: Invoice[]
}

export default Customer

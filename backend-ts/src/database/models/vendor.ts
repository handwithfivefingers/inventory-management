import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany
} from 'sequelize-typescript'
import { User } from './user'
import { Warehouse } from './warehouse'
import { Category } from './category'
import { Tag } from './tag'
import { Unit } from './units'
import { Staff } from './staff'
import { StaffVendor } from './staff_vendor'

@Table({ tableName: 'vendors', modelName: 'vendor', timestamps: true })
export class Vendor extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.STRING)
  declare name: string

  @Column(DataType.STRING)
  declare niche: string

  /**
   * Registered legal name used on invoices/documents. Nullable: individual
   * sellers / small shops may not have one. Document generation falls back
   * to `name`, then to the owner's email (see SettingService).
   */
  @Column({ type: DataType.STRING, field: 'legal_name', allowNull: true })
  declare legalName: string | null

  @Column({ type: DataType.STRING, field: 'tax_number', allowNull: true })
  declare taxNumber: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare address: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null

  /**
   * Custom prefix for generated invoice numbers (e.g. "HD", "INV-25").
   * Nullable: falls back to the derived vendor code. Changing it only
   * affects FUTURE invoices - issued numbers are immutable.
   */
  @Column({ type: DataType.STRING(20), field: 'invoice_series_prefix', allowNull: true })
  declare invoiceSeriesPrefix: string | null

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  declare userId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare user: User

  @HasMany(() => Warehouse)
  declare warehouses: Warehouse[]

  @HasMany(() => Category)
  declare categories: Category[]

  @HasMany(() => Tag)
  declare tags: Tag[]

  @HasMany(() => Unit)
  declare units: Unit[]

  @BelongsToMany(() => Staff, () => StaffVendor)
  declare staffs: Staff[]
}

export default Vendor

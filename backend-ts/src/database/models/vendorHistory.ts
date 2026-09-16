import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Vendor } from './vendor'

const jsonField = (field: string) => ({
  get(this: any) {
    const val = this.getDataValue(field)
    if (val == null) return null
    if (typeof val === 'object') return val
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  },
  set(this: any, value: any) {
    this.setDataValue(field, value == null ? null : JSON.stringify(value))
  }
})

/**
 * Append-only audit log for Vendor master-data changes.
 *
 * Updating `vendors` (legal_name, address, tax_number, ...) must NEVER
 * cascade to already-issued invoices - they keep the snapshot taken at
 * issue time. This table records { before, after } per change for
 * compliance / audit tracking instead.
 */
@Table({ tableName: 'vendor_histories', modelName: 'vendorHistory', timestamps: true })
export class VendorHistory extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare vendorId: number

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare changedBy: number | null

  @Column({ type: DataType.TEXT, ...jsonField('changes') })
  declare changes: { before: Record<string, unknown>; after: Record<string, unknown> } | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare vendor: Vendor
}

export default VendorHistory

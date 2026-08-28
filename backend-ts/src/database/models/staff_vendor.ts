import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey } from 'sequelize-typescript'
import { Staff } from './staff'
import { Vendor } from './vendor'

@Table({ tableName: 'staff_vendor', modelName: 'staff_vendor', timestamps: true })
export class StaffVendor extends Model {
  @ForeignKey(() => Staff)
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true })
  declare staffId: number

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true })
  declare vendorId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}

export default StaffVendor

import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Staff } from './staff'
import { Warehouse } from './warehouse'

@Table({ tableName: 'financial_records', modelName: 'financialRecord', timestamps: true })
export class FinancialRecord extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false, comment: 'Voucher code, e.g. PT-00001 (revenue) / PC-00001 (expense)' })
  declare code: string

  @Column({ type: DataType.ENUM('revenue', 'expense'), allowNull: false, comment: 'revenue: phiếu thu, expense: phiếu chi' })
  declare type: 'revenue' | 'expense'

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'other', comment: 'sale | import | salary | rent | other' })
  declare category: string

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 })
  declare amount: number

  @Column({ type: DataType.STRING, allowNull: true })
  declare note: string | null

  @Column({ type: DataType.STRING, allowNull: true, comment: 'order | importOrder | shift' })
  declare relatedType: string | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare relatedId: number | null

  @ForeignKey(() => Staff)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare staffId: number | null

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare warehouseId: number | null

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare transactionDate: Date

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Staff)
  declare staff: Staff

  @BelongsTo(() => Warehouse)
  declare warehouse: Warehouse
}

export default FinancialRecord

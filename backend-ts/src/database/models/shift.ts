import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Staff } from './staff'
import { Warehouse } from './warehouse'

@Table({ tableName: 'shifts', modelName: 'shift', timestamps: true })
export class Shift extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false, comment: 'Shift code, e.g. CA-0001' })
  declare code: string

  @ForeignKey(() => Staff)
  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'Staff who opens the shift' })
  declare staffId: number | null

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare openTime: Date

  @Column({ type: DataType.DATE, allowNull: true })
  declare closeTime: Date | null

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0, comment: 'Cash in drawer at shift open' })
  declare openingCash: number

  @Column({ type: DataType.BIGINT, allowNull: true, comment: 'Cash counted at shift close' })
  declare closingCash: number | null

  @Column({ type: DataType.BIGINT, allowNull: true, comment: 'Expected cash = opening + system revenue' })
  declare expectedCash: number | null

  @Column({ type: DataType.BIGINT, allowNull: true, comment: 'Actual cash counted' })
  declare actualCash: number | null

  @Column({ type: DataType.BIGINT, allowNull: true, comment: 'actualCash - expectedCash' })
  declare difference: number | null

  @Column({ type: DataType.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' })
  declare status: 'open' | 'closed'

  @Column({ type: DataType.STRING, allowNull: true })
  declare note: string | null

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare warehouseId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Staff, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare staff: Staff

  @BelongsTo(() => Warehouse, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare warehouse: Warehouse
}

export default Shift

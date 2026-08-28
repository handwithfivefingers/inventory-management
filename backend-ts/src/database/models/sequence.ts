import { Table, Column, Model, DataType, Index, CreatedAt, UpdatedAt } from 'sequelize-typescript'

/**
 * Atomic per-scope code counters used by invoice/staff/product code
 * generation (see src/utils/sequence.ts). One row per (scopeKey, year);
 * `seq` is incremented with the LAST_INSERT_ID() trick so concurrent
 * requests can never observe the same value.
 */
@Table({
  tableName: 'sequences',
  modelName: 'sequence',
  timestamps: true,
  indexes: [{ unique: true, fields: ['scopeKey', 'year'] }]
})
export class Sequence extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare scopeKey: string

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare year: number | null

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare seq: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}

export default Sequence

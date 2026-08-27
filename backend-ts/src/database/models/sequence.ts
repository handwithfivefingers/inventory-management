import { DataTypes, Sequelize } from 'sequelize'

/**
 * Atomic per-scope code counters used by invoice/staff/product code
 * generation (see src/utils/sequence.ts). One row per (scopeKey, year);
 * `seq` is incremented with the LAST_INSERT_ID() trick so concurrent
 * requests can never observe the same value.
 */
const SequenceModel = (sequelize: Sequelize) => {
  const M = sequelize.define(
    'sequence',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      scopeKey: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      seq: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      timestamps: true,
      tableName: 'sequences',
      indexes: [
        {
          unique: true,
          fields: ['scopeKey', 'year']
        }
      ]
    }
  )
  return M
}

export default SequenceModel

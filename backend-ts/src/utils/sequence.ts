import database from '#/database'
import { Transaction } from 'sequelize'

/**
 * Atomic per-scope sequence counters backed by the `sequences` table
 * (columns: scopeKey, year, seq - unique together).
 *
 * Uses the MySQL LAST_INSERT_ID(expr) trick inside a transaction:
 *   INSERT ... ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)
 * followed by SELECT LAST_INSERT_ID() on the SAME connection (the
 * transaction pins one pooled connection), which makes read-modify-write
 * races impossible without row locks held by application code.
 *
 * SKIP LOCKED is intentionally NOT used here: concurrent creators for the
 * same vendor must block on their own counter row, not skip it.
 */

interface INextSequenceOptions {
  /** Sequelize transaction - REQUIRED so both statements share a connection */
  transaction?: Transaction
  /**
   * Value used when the counter row does not exist yet (lazy init).
   * Callers should derive it from current max data so pre-existing rows
   * keep monotonically increasing codes.
   */
  initial?: number
}

export const nextSequence = async (
  scopeKey: string,
  year: number | null,
  options: INextSequenceOptions = {}
): Promise<number> => {
  const { sequelize } = database
  const t = options.transaction ?? (await sequelize.transaction())
  const ownsTx = !options.transaction
  try {
    const initial = Math.max(1, Number(options.initial) || 1)
    await sequelize.query(
      `INSERT INTO sequences (scopeKey, year, seq, createdAt, updatedAt)
       VALUES (:scopeKey, :year, :initial, NOW(), NOW())
       ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)`,
      {
        replacements: { scopeKey, year, initial },
        transaction: t
      }
    )
    const [rows] = await sequelize.query('SELECT LAST_INSERT_ID() AS seq', { transaction: t })
    const seq = Number((rows as any[])[0]?.seq)
    if (!Number.isFinite(seq) || seq <= 0) {
      throw new Error(`sequence: could not read counter for ${scopeKey}/${year}`)
    }
    if (ownsTx) await t.commit()
    return seq
  } catch (error) {
    if (ownsTx) await t.rollback()
    throw error
  }
}

/** True when the error is a MySQL duplicate-entry violation (ER_DUP_ENTRY). */
export const isDuplicateEntryError = (error: unknown): boolean => {
  const err = error as { name?: string; original?: { code?: string }; code?: string }
  return (
    err?.name === 'SequelizeUniqueConstraintError' ||
    err?.original?.code === 'ER_DUP_ENTRY' ||
    err?.code === 'ER_DUP_ENTRY'
  )
}

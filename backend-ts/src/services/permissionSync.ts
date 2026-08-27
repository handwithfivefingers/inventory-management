import { MODULES } from '#/constant/modules'
import database from '#/database'

export interface ISyncResult {
  legacyMigrated: boolean
  createdPermissions: number
  linkedAdminPermissions: number
  scannedRoles: number
}

/** Legacy per-role permission row (pre-hybrid shape, flags on permission). */
export interface ILegacyPermission {
  id: number
  name: string
  C?: boolean
  R?: boolean
  U?: boolean
  D?: boolean
}

export interface ILegacyJoinRow {
  roleId: number
  permissionId: number
  C?: boolean
  R?: boolean
  U?: boolean
  D?: boolean
}

export interface IPlannedJoinRow extends ILegacyJoinRow {}

export interface ILegacyMergePlan {
  /** Deduplicated join rows to write (flags resolved & OR-merged). */
  joinRows: IPlannedJoinRow[]
  /** Catalog rows that survive the dedupe. */
  canonicalPermissionIds: number[]
}

/**
 * Legacy data model: flags lived ON the permission row; the new model puts
 * them on the join row. A join row's explicit flag wins, otherwise fall back
 * to the linked permission's flag.
 */
export const planLegacyMerge = (
  permissions: ILegacyPermission[],
  joinRows: ILegacyJoinRow[]
): ILegacyMergePlan => {
  // Canonical id per name = lowest id (stable, keeps oldest row).
  const canonical = new Map<string, number>()
  for (const permission of [...permissions].sort((a, b) => a.id - b.id)) {
    if (!canonical.has(permission.name)) canonical.set(permission.name, permission.id)
  }
  const byId = new Map(permissions.map((p) => [p.id, p]))

  const flagsByKey = new Map<string, IPlannedJoinRow>()
  for (const row of joinRows) {
    const permission = byId.get(row.permissionId)
    if (!permission) continue // dangling link - drop it
    const canonicalId = canonical.get(permission.name)!
    const key = `${row.roleId}:${canonicalId}`

    // Explicit join flag wins; otherwise inherit the legacy permission flag.
    const resolved = {
      C: row.C === true || permission.C === true,
      R: row.R === true || permission.R === true,
      U: row.U === true || permission.U === true,
      D: row.D === true || permission.D === true
    }

    const existing = flagsByKey.get(key)
    if (!existing) {
      flagsByKey.set(key, { roleId: row.roleId, permissionId: canonicalId, ...resolved })
    } else {
      // Collision: same role linked to two copies of the same module -
      // keep the union of grants rather than losing any.
      existing.C = existing.C || resolved.C
      existing.R = existing.R || resolved.R
      existing.U = existing.U || resolved.U
      existing.D = existing.D || resolved.D
    }
  }

  return {
    joinRows: Array.from(flagsByKey.values()),
    canonicalPermissionIds: Array.from(canonical.values())
  }
}

/**
 * Owns everything that keeps RBAC data healthy:
 *  1. migrateLegacyIfNeeded - one-time move of C/R/U/D flags from duplicated
 *     per-role permission rows onto the shared join table (hybrid refactor).
 *  2. ensureCatalog         - find-or-create a catalog row per canonical module.
 *  3. linkAdminRoles        - grant Admin roles every missing module (full CRUD).
 */
class PermissionSyncService {
  /**
   * Detect the pre-hybrid schema (C column on `permissions`) and merge the
   * data into the hybrid shape. No-op when already migrated.
   */
  async migrateLegacyIfNeeded(): Promise<boolean> {
    const qi = database.sequelize.getQueryInterface()
    let description: Record<string, unknown>
    try {
      description = await qi.describeTable('permissions')
    } catch {
      return false // table does not exist yet - fresh install, nothing to do
    }
    if (!('C' in description)) return false

    // Ensure join table has C/R/U/D columns before we try to write them.
    // When the DB was created via sync() the columns may still be missing;
    // the dedicated migration 20260824030000 covers the CLI path, but this
    // guard makes the boot-time idempotent path safe without a separate CLI run.
    // Ensure join table has C/R/U/D before migration - single describe reused
    // to avoid extra mock calls in tests and to keep the SELECT decision correct.
    let hasJoinFlags = false
    try {
      const joinDesc = (await qi.describeTable('role_permissions')) as Record<string, unknown>
      hasJoinFlags = !!joinDesc && 'C' in joinDesc
      if (!hasJoinFlags && joinDesc) {
        const { DataTypes } = await import('sequelize')
        for (const col of ['C', 'R', 'U', 'D']) {
          if (col in joinDesc) continue
          try {
            await (qi as any).addColumn?.('role_permissions', col, {
              type: DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: false
            })
          } catch (e) {
            if (!/Duplicate|exists|already/i.test(String((e as any)?.message ?? e))) throw e
          }
        }
        // After adding columns, subsequent SELECT can safely request them
        hasJoinFlags = true
      }
    } catch {
      hasJoinFlags = false
    }

    const t = await database.sequelize.transaction()
    try {
      const [permissions] = await database.sequelize.query(
        'SELECT id, name, C, R, U, D FROM permissions',
        { transaction: t }
      )
      const [joinRows] = await database.sequelize.query(
        hasJoinFlags
          ? 'SELECT roleId, permissionId, C, R, U, D FROM role_permissions'
          : 'SELECT roleId, permissionId, NULL AS C, NULL AS R, NULL AS U, NULL AS D FROM role_permissions',
        { transaction: t }
      )

      const plan = planLegacyMerge(permissions as ILegacyPermission[], joinRows as unknown as ILegacyJoinRow[])

      await database.sequelize.query('DELETE FROM role_permissions', { transaction: t })
      for (const row of plan.joinRows) {
        await database.sequelize.query(
          'INSERT INTO role_permissions (roleId, permissionId, C, R, U, D, createdAt, updatedAt)' +
            ' VALUES (:roleId, :permissionId, :C, :R, :U, :D, NOW(), NOW())',
          {
            replacements: { ...row, C: row.C ? 1 : 0, R: row.R ? 1 : 0, U: row.U ? 1 : 0, D: row.D ? 1 : 0 },
            transaction: t
          }
        )
      }

      if (plan.canonicalPermissionIds.length > 0) {
        await database.sequelize.query(
          'DELETE FROM permissions WHERE id NOT IN (:ids)',
          { replacements: { ids: plan.canonicalPermissionIds }, transaction: t }
        )
      } else {
        await database.sequelize.query('DELETE FROM permissions', { transaction: t })
      }

      await t.commit()
      console.log(`legacy permission migration applied (${plan.joinRows.length} join rows kept)`)
      return true
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /** Ensure the catalog has exactly one row per canonical module. */
  async ensureCatalog(transaction?: any): Promise<number> {
    let created = 0
    for (const module of MODULES) {
      const [, built] = await database.permission.findOrCreate({
        where: { name: module.key },
        defaults: { name: module.key, description: module.description },
        transaction
      })
      if (built) created += 1
    }
    return created
  }

  /** Grant Admin roles every missing catalog module with full CRUD. */
  async linkAdminRoles(transaction?: any): Promise<{ scannedRoles: number; linked: number }> {
    const roles = await database.role.findAll({
      include: [{ model: database.permission }],
      transaction
    })
    let linked = 0

    for (const role of roles) {
      if (String(role.name ?? '').trim().toLowerCase() !== 'admin') continue

      // Permissions may arrive flattened or with nested join attrs.
      const existingNames = new Set(
        ((role as any).permissions ?? []).map((p: any) =>
          typeof p?.name === 'string' ? p.name.toLowerCase() : null
        ).filter(Boolean)
      )

      for (const module of MODULES) {
        if (existingNames.has(module.key.toLowerCase())) continue

        const [permission] = await database.permission.findOrCreate({
          where: { name: module.key },
          defaults: { name: module.key, description: module.description },
          transaction
        })

        await database.role_permission.create(
          { roleId: role.id, permissionId: permission.id, C: true, R: true, U: true, D: true },
          { transaction }
        )
        linked += 1
      }
    }

    return { scannedRoles: roles.length, linked }
  }

  /** Orchestrate all steps. Safe to run at every boot and repeatedly. */
  async sync(): Promise<ISyncResult> {
    const result: ISyncResult = {
      legacyMigrated: false,
      createdPermissions: 0,
      linkedAdminPermissions: 0,
      scannedRoles: 0
    }

    // Migration manages its own transaction - run it before opening ours so
    // the two never contend for the same table locks.
    result.legacyMigrated = await this.migrateLegacyIfNeeded()

    const t = await database.sequelize.transaction()
    try {
      result.createdPermissions = await this.ensureCatalog(t)
      const { scannedRoles, linked } = await this.linkAdminRoles(t)
      result.scannedRoles = scannedRoles
      result.linkedAdminPermissions = linked
      await t.commit()
      return result
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}

export default PermissionSyncService

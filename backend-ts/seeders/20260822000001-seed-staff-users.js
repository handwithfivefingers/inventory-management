'use strict'

/**
 * Seed a basic "Staff" role (with day-to-day employee permissions) and a
 * demo staff login account so employees can actually use the application.
 *
 * Why this exists: `register()` only provisions owner accounts (role `Admin`
 * with full CRUD), and a user whose role has no permission rows passes login
 * but gets HTTP 403 from `authorize()` on every business API. This seeder
 * gives staff users a working starting point.
 *
 * Login: seed-staff@example.com / password123
 *
 * Notes:
 * - bulkInsert does NOT run model hooks, so passwords are hashed here with
 *   bcryptjs to match the user model's `set` hook.
 * - Permission names/flags mirror `buildStaffPermissions()` in
 *   `#/libs/permission.ts` (seeders run as plain JS and cannot import TS).
 * - Every step is guarded, so re-running is safe.
 * - Driver contract: with `type: QueryTypes.SELECT`, `sequelize.query`
 *   resolves to a PLAIN ROWS ARRAY (no `[rows, fields]` tuple), and
 *   `bulkInsert` resolves undefined on MySQL - so ids are always read back
 *   via SELECT instead of from insert return values.
 */

const bcrypt = require('bcryptjs')

const STAFF_ROLE_NAME = 'Staff'
const STAFF_EMAIL = 'seed-staff@example.com'
const STAFF_PASSWORD = 'password123'

/** Read-only modules for basic staff. */
const READ_ONLY = ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse']
/** Day-to-day selling modules: create/read/update, never delete. */
const CONTRIBUTE = ['order', 'customer', 'invoice', 'shift']

const flagsFor = (name) =>
  CONTRIBUTE.includes(name)
    ? { C: true, R: true, U: true, D: false }
    : { C: false, R: true, U: false, D: false }

// READ_ONLY / CONTRIBUTE / flagsFor are exported so the permission unit test
// can verify they never drift from `buildStaffPermissions()` in
// `#/libs/permission.ts`. run-seeds.js only consumes `up`/`down`.
module.exports = {
  READ_ONLY,
  CONTRIBUTE,
  flagsFor,

  async up(queryInterface, Sequelize) {
    const now = new Date()
    const selectRows = async (sql, replacements) =>
      queryInterface.sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT })

    // Sanity guard against silent drift between this file and the canonical
    // MODULES registry enforced by the backend's authorize() middleware.
    const known = ['dashboard', 'order', 'product', 'customer', 'invoice', 'provider', 'import-order', 'warehouse', 'category', 'unit', 'tag', 'financial', 'staff', 'shift', 'setting', 'role']
    const permissionNames = [...READ_ONLY, ...CONTRIBUTE]
    const unknown = permissionNames.filter((n) => !known.includes(n))
    if (unknown.length) throw new Error(`seed-staff-users: unknown module keys ${unknown.join(', ')}`)

    // 1. Staff role (global). Re-use an existing one on re-runs.
    let roleId
    const roles = await selectRows('SELECT id FROM roles WHERE LOWER(name) = ? LIMIT 1', [
      STAFF_ROLE_NAME.toLowerCase()
    ])
    if (roles.length) {
      roleId = roles[0].id
    } else {
      await queryInterface.bulkInsert('roles', [
        {
          name: STAFF_ROLE_NAME,
          description: 'Nhân viên - Quyền cơ bản (bán hàng, khách hàng, hóa đơn, ca làm việc)',
          vendorId: null,
          isGlobal: true,
          createdAt: now,
          updatedAt: now
        }
      ])
      const [createdRole] = await selectRows('SELECT id FROM roles WHERE LOWER(name) = ?', [
        STAFF_ROLE_NAME.toLowerCase()
      ])
      if (!createdRole) throw new Error('seed-staff-users: failed to create the Staff role')
      roleId = createdRole.id
    }

    // 2. Permission rows (exact module key + flag match => no duplicates).
    const permissionIds = []
    for (const name of permissionNames) {
      const flags = flagsFor(name)
      const findSql =
        'SELECT id FROM permissions WHERE name = ? AND C = ? AND R = ? AND U = ? AND D = ? LIMIT 1'
      const findArgs = [name, flags.C, flags.R, flags.U, flags.D]
      const existing = await selectRows(findSql, findArgs)
      if (existing.length) {
        permissionIds.push(existing[0].id)
        continue
      }
      await queryInterface.bulkInsert('permissions', [
        { name, description: null, ...flags, createdAt: now, updatedAt: now }
      ])
      const [createdPermission] = await selectRows(findSql, findArgs)
      if (!createdPermission) throw new Error(`seed-staff-users: failed to create permission "${name}"`)
      permissionIds.push(createdPermission.id)
    }

    // 3. Link role -> permissions (skip pairs that already exist).
    const existingLinks = await selectRows('SELECT permissionId FROM role_permissions WHERE roleId = ?', [
      roleId
    ])
    const linked = new Set(existingLinks.map((row) => row.permissionId))
    const missing = permissionIds.filter((id) => !linked.has(id))
    if (missing.length) {
      await queryInterface.bulkInsert(
        'role_permissions',
        missing.map((permissionId) => ({ roleId, permissionId, createdAt: now, updatedAt: now }))
      )
    }

    // 4. Staff user account (skip if it already exists).
    let userId
    const users = await selectRows('SELECT id FROM users WHERE email = ?', [STAFF_EMAIL])
    if (users.length) {
      userId = users[0].id
    } else {
      await queryInterface.bulkInsert('users', [
        {
          nickname: 'SEED Staff',
          firstName: 'Seed',
          lastName: 'Staff',
          email: STAFF_EMAIL,
          password: bcrypt.hashSync(STAFF_PASSWORD, 10),
          subscription: 'free',
          createdAt: now,
          updatedAt: now
        }
      ])
      const [createdUser] = await selectRows('SELECT id FROM users WHERE email = ?', [STAFF_EMAIL])
      if (!createdUser) throw new Error('seed-staff-users: failed to create the staff account')
      userId = createdUser.id
    }

    // 5. Assign exactly ONE role per user (`user_roles.userId` is UNIQUE).
    const userRoles = await selectRows('SELECT id FROM user_roles WHERE userId = ?', [userId])
    if (!userRoles.length) {
      await queryInterface.bulkInsert('user_roles', [
        { userId, roleId, vendorId: null, createdAt: now, updatedAt: now }
      ])
    }

    // 6. Give the account its own vendor + main warehouse so `login` can
    //    return defaultVendorId/defaultWarehouseId (the client seeds its
    //    session with those values).
    const vendors = await selectRows(
      'SELECT id FROM vendors WHERE userId = ? AND name LIKE ? ORDER BY id ASC LIMIT 1',
      [userId, 'SEED-Staff%']
    )
    let vendorId
    if (vendors.length) {
      vendorId = vendors[0].id
    } else {
      await queryInterface.bulkInsert('vendors', [
        { name: 'SEED-Staff Vendor', userId, createdAt: now, updatedAt: now }
      ])
      const [createdVendor] = await selectRows(
        'SELECT id FROM vendors WHERE userId = ? AND name LIKE ? ORDER BY id ASC LIMIT 1',
        [userId, 'SEED-Staff%']
      )
      if (!createdVendor) throw new Error('seed-staff-users: failed to create the staff vendor')
      vendorId = createdVendor.id
    }

    const warehouses = await selectRows('SELECT id FROM warehouses WHERE vendorId = ? LIMIT 1', [vendorId])
    if (!warehouses.length) {
      await queryInterface.bulkInsert('warehouses', [
        {
          name: 'Main Warehouse',
          isMain: true,
          vendorId,
          address: '123 Main St',
          phone: '1234567890',
          email: 'example@example.com',
          createdAt: now,
          updatedAt: now
        }
      ])
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove everything this seeder may have created (reverse order).
    const selectRows = async (sql, replacements) =>
      queryInterface.sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT })

    const users = await selectRows('SELECT id FROM users WHERE email = ?', [STAFF_EMAIL])
    const userIds = users.map((u) => u.id)

    // Vendor + warehouse of the staff account.
    if (userIds.length) {
      await queryInterface.sequelize.query(
        'DELETE w FROM warehouses w INNER JOIN vendors v ON v.id = w.vendorId WHERE v.userId = ? AND v.name LIKE ?',
        { replacements: [userIds[0], 'SEED-Staff%'] }
      )
      await queryInterface.bulkDelete('vendors', { userId: userIds, name: { [Sequelize.Op.like]: 'SEED-Staff%' } }, {})
      await queryInterface.bulkDelete('user_roles', { userId: userIds }, {})
      await queryInterface.bulkDelete('users', { id: userIds }, {})
    }

    // Staff role + its links.
    const roles = await selectRows('SELECT id FROM roles WHERE LOWER(name) = ?', [
      STAFF_ROLE_NAME.toLowerCase()
    ])
    const roleIds = roles.map((r) => r.id)
    if (roleIds.length) {
      await queryInterface.bulkDelete('role_permissions', { roleId: roleIds }, {})
      await queryInterface.bulkDelete('roles', { id: roleIds }, {})
    }

    // Delete the exact permission rows we seeded, but only if no other role
    // still references them (an Admin role could have been granted the same
    // read-only rows manually).
    const names = [...READ_ONLY, ...CONTRIBUTE]
    await queryInterface.sequelize.query(
      `DELETE p FROM permissions p
       LEFT JOIN role_permissions rp ON rp.permissionId = p.id
       WHERE p.name IN (${names.map(() => '?').join(',')}) AND rp.id IS NULL`,
      { replacements: names }
    )
  }
}

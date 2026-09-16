'use strict'

/**
 * Seed a demo Staff role + account with its vendor/warehouse workspace.
 *
 * Flow: Staff role (idempotent) -> 10 permission grants (Staff preset:
 * read-only catalog + daily selling modules) -> role_permissions links ->
 * demo user (seed-staff@example.com) -> user_roles assignment ->
 * vendor -> main warehouse.
 *
 * Idempotent: every insert is preceded by a SELECT existence check and
 * followed by a read-back SELECT (ids are never taken from `bulkInsert`
 * return values - the MySQL driver resolves them undefined).
 */

const bcrypt = require('bcryptjs')

const STAFF_ROLE_NAME = 'Staff'
const STAFF_EMAIL = 'seed-staff@example.com'
const STAFF_PASSWORD = 'password123'

// Staff preset: catalog/dashboard visibility (read-only) plus the
// day-to-day selling modules (create/read/update, never delete).
const GRANTS = [
  { name: 'dashboard', C: false, R: true, U: false, D: false },
  { name: 'product', C: false, R: true, U: false, D: false },
  { name: 'category', C: false, R: true, U: false, D: false },
  { name: 'unit', C: false, R: true, U: false, D: false },
  { name: 'tag', C: false, R: true, U: false, D: false },
  { name: 'warehouse', C: false, R: true, U: false, D: false },
  { name: 'order', C: true, R: true, U: true, D: false },
  { name: 'customer', C: true, R: true, U: true, D: false },
  { name: 'invoice', C: true, R: true, U: true, D: false },
  { name: 'shift', C: true, R: true, U: true, D: false }
]

const selectRow = async (queryInterface, Sequelize, sql, replacements) => {
  const rows = await queryInterface.sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  })
  const list = Array.isArray(rows) ? rows : []
  return list.length > 0 ? list[0] : undefined
}

const selectRows = async (queryInterface, Sequelize, sql, replacements) => {
  const rows = await queryInterface.sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  })
  return Array.isArray(rows) ? rows : []
}

/** Ensure the Staff role exists; return its id. */
const ensureStaffRole = async (queryInterface, Sequelize, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM roles WHERE name = :name LIMIT 1',
    { name: STAFF_ROLE_NAME }
  )
  if (existing) return existing.id
  await queryInterface.bulkInsert('roles', [
    {
      name: STAFF_ROLE_NAME,
      description: 'Seeded demo staff role',
      isGlobal: false,
      isSystem: false,
      createdAt: now,
      updatedAt: now
    }
  ])
  const created = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM roles WHERE name = :name LIMIT 1',
    { name: STAFF_ROLE_NAME }
  )
  return created.id
}

/** Ensure each grant module has a permission row; return ordered ids. */
const ensurePermissions = async (queryInterface, Sequelize, now) => {
  const ids = []
  for (const grant of GRANTS) {
    const existing = await selectRow(
      queryInterface,
      Sequelize,
      'SELECT id FROM permissions WHERE name = :name LIMIT 1',
      { name: grant.name }
    )
    if (existing) {
      ids.push(existing.id)
      continue
    }
    await queryInterface.bulkInsert('permissions', [
      {
        name: grant.name,
        description: `${grant.name} module`,
        createdAt: now,
        updatedAt: now
      }
    ])
    const created = await selectRow(
      queryInterface,
      Sequelize,
      'SELECT id FROM permissions WHERE name = :name LIMIT 1',
      { name: grant.name }
    )
    ids.push(created.id)
  }
  return ids
}

/** Link the missing grants onto the role in a single batched insert. */
const ensureRoleLinks = async (queryInterface, Sequelize, roleId, permissionIds, now) => {
  const existingLinks = await selectRows(
    queryInterface,
    Sequelize,
    'SELECT permissionId FROM role_permissions WHERE roleId = :roleId',
    { roleId }
  )
  const linked = new Set(existingLinks.map((row) => row.permissionId))
  const seen = new Set()
  const missing = []
  permissionIds.forEach((permissionId, index) => {
    if (linked.has(permissionId) || seen.has(permissionId)) return
    seen.add(permissionId)
    const grant = GRANTS[index % GRANTS.length]
    missing.push({
      roleId,
      permissionId,
      C: grant.C,
      R: grant.R,
      U: grant.U,
      D: grant.D,
      createdAt: now,
      updatedAt: now
    })
  })
  if (missing.length > 0) {
    await queryInterface.bulkInsert('role_permissions', missing)
  }
}

/** Ensure the demo staff account exists; return its id. */
const ensureStaffUser = async (queryInterface, Sequelize, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM users WHERE email = :email LIMIT 1',
    { email: STAFF_EMAIL }
  )
  if (existing) return existing.id
  await queryInterface.bulkInsert('users', [
    {
      email: STAFF_EMAIL,
      password: bcrypt.hashSync(STAFF_PASSWORD, 10),
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ])
  const created = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM users WHERE email = :email LIMIT 1',
    { email: STAFF_EMAIL }
  )
  return created.id
}

/** Ensure the user holds exactly the Staff role; single-role policy. */
const ensureUserRole = async (queryInterface, Sequelize, userId, roleId, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM user_roles WHERE userId = :userId LIMIT 1',
    { userId }
  )
  if (existing) return
  await queryInterface.bulkInsert('user_roles', [{ userId, roleId, createdAt: now, updatedAt: now }])
}

/** Ensure the demo vendor workspace exists; return its id. */
const ensureVendor = async (queryInterface, Sequelize, userId, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM vendors WHERE userId = :userId LIMIT 1',
    { userId }
  )
  if (existing) return existing.id
  await queryInterface.bulkInsert('vendors', [
    {
      name: 'Seed Vendor',
      userId,
      createdAt: now,
      updatedAt: now
    }
  ])
  const created = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM vendors WHERE userId = :userId LIMIT 1',
    { userId }
  )
  return created.id
}

/** Ensure the vendor has its main warehouse. */
const ensureWarehouse = async (queryInterface, Sequelize, vendorId, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id FROM warehouses WHERE vendorId = :vendorId LIMIT 1',
    { vendorId }
  )
  if (existing) return
  await queryInterface.bulkInsert('warehouses', [
    {
      name: 'Main Warehouse',
      vendorId,
      isMain: true,
      createdAt: now,
      updatedAt: now
    }
  ])
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    const roleId = await ensureStaffRole(queryInterface, Sequelize, now)
    const permissionIds = await ensurePermissions(queryInterface, Sequelize, now)
    await ensureRoleLinks(queryInterface, Sequelize, roleId, permissionIds, now)
    const userId = await ensureStaffUser(queryInterface, Sequelize, now)
    await ensureUserRole(queryInterface, Sequelize, userId, roleId, now)
    const vendorId = await ensureVendor(queryInterface, Sequelize, userId, now)
    await ensureWarehouse(queryInterface, Sequelize, vendorId, now)
  },

  async down(queryInterface, Sequelize) {
    const staffUser = await selectRow(
      queryInterface,
      Sequelize,
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { email: STAFF_EMAIL }
    )
    const staffRole = await selectRow(
      queryInterface,
      Sequelize,
      'SELECT id FROM roles WHERE name = :name LIMIT 1',
      { name: STAFF_ROLE_NAME }
    )
    const userId = staffUser ? staffUser.id : null
    const roleId = staffRole ? staffRole.id : null

    // Joins before the rows they reference.
    await queryInterface.bulkDelete('vendors', { userId }, {})
    await queryInterface.bulkDelete('user_roles', { userId }, {})
    await queryInterface.bulkDelete('users', { id: userId }, {})
    await queryInterface.bulkDelete('role_permissions', { roleId }, {})
    await queryInterface.bulkDelete('roles', { id: roleId }, {})

    // Only orphaned permissions of the seeded modules are removed.
    await queryInterface.sequelize.query(
      'DELETE p FROM permissions p LEFT JOIN role_permissions rp ON rp.permissionId = p.id WHERE rp.id IS NULL AND p.name IN (:names)',
      {
        replacements: { names: GRANTS.map((grant) => grant.name) },
        type: Sequelize.QueryTypes.DELETE
      }
    )
  }
}

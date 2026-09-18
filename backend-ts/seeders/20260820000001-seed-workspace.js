'use strict'

/**
 * Seed a demo Staff account with its vendor/warehouse workspace.
 *
 * Flow: system "Staff" role (reused from 20260225000001 - the permission
 * catalog and its method-based grants already exist there) -> demo user
 * (seed-staff@example.com) -> user_roles assignment -> vendor -> main
 * warehouse.
 *
 * The previous version created its own module permissions + role_permissions
 * C/R/U/D flags; the schema now models grants as `permissions.method` rows
 * linked on `role_permissions`, so this seeder only wires the demo account to
 * the pre-seeded system Staff role.
 *
 * Idempotent: every insert is preceded by a SELECT existence check and
 * followed by a read-back SELECT (ids are never taken from `bulkInsert`
 * return values - the MySQL driver resolves them undefined).
 */

const bcrypt = require('bcryptjs')

const STAFF_ROLE_NAME = 'Staff'
const STAFF_EMAIL = 'seed-staff@example.com'
const STAFF_PASSWORD = 'password123'

const selectRow = async (queryInterface, Sequelize, sql, replacements) => {
  const rows = await queryInterface.sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  })
  const list = Array.isArray(rows) ? rows : []
  return list.length > 0 ? list[0] : undefined
}

/**
 * Ensure the Staff role exists (normally created by 20260225000001). The
 * fallback role is deliberately NOT isSystem so `down()` can clean it up if
 * the MUST migration never ran.
 */
const ensureStaffRole = async (queryInterface, Sequelize, now) => {
  const existing = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id, isSystem FROM roles WHERE name = :name LIMIT 1',
    { name: STAFF_ROLE_NAME }
  )
  if (existing) return existing.id
  await queryInterface.bulkInsert('roles', [
    {
      name: STAFF_ROLE_NAME,
      description: 'Nhân viên - Quyền cơ bản (bán hàng, khách hàng, hóa đơn, ca làm việc)',
      isGlobal: true,
      isSystem: false,
      isAdmin: false,
      createdAt: now,
      updatedAt: now
    }
  ])
  const created = await selectRow(
    queryInterface,
    Sequelize,
    'SELECT id, isSystem FROM roles WHERE name = :name LIMIT 1',
    { name: STAFF_ROLE_NAME }
  )
  return created.id
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
      'SELECT id, isSystem FROM roles WHERE name = :name LIMIT 1',
      { name: STAFF_ROLE_NAME }
    )
    const userId = staffUser ? staffUser.id : null
    const roleId = staffRole ? staffRole.id : null

    // Joins before the rows they reference.
    if (userId !== null) {
      await queryInterface.bulkDelete('vendors', { userId }, {})
      await queryInterface.bulkDelete('user_roles', { userId }, {})
      await queryInterface.bulkDelete('users', { id: userId }, {})
    }

    // Only roles created by this seeder's fallback are removed; the system
    // Staff role (and its permission grants) belongs to 20260225000001.
    if (roleId !== null && staffRole.isSystem !== true) {
      await queryInterface.bulkDelete('role_permissions', { roleId }, {})
      await queryInterface.bulkDelete('roles', { id: roleId }, {})
    }
  }
}
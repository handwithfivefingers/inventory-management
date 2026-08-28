'use strict'

/**
 * MUST migration: instant system role + permission catalog.
 *
 * Keeps DB bootable even if all seeders / other migrations are wiped.
 * Merged from 20260827000000-add-system-flag-and-seed-default-roles.js
 *
 * - Role id=1 Admin { isSystem:true, isGlobal:true, isAdmin:true } + 5 other
 *   system roles (Manager, Staff, Cashier, Warehouse, Sales)
 * - Permissions: 16 modules x 4 methods = 64 rows (name + method)
 * - role_permissions: links per grant (C->CREATE, R->READ, U->UPDATE, D->DELETE)
 *
 * Idempotent: safe to re-run, uses INSERT IGNORE + existence checks.
 */

const METHODS = ['CREATE', 'READ', 'UPDATE', 'DELETE']
const MODULES = [
  'dashboard',
  'order',
  'product',
  'customer',
  'invoice',
  'provider',
  'import-order',
  'warehouse',
  'category',
  'unit',
  'tag',
  'financial',
  'staff',
  'shift',
  'setting',
  'role'
]

const READ_ONLY = ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse']
const CONTRIBUTE = ['order', 'customer', 'invoice', 'shift']

const emptyGrant = { C: false, R: false, U: false, D: false }

const buildStaffPermissions = () => {
  const m = new Map()
  for (const k of READ_ONLY) m.set(k, { ...emptyGrant, R: true })
  for (const k of CONTRIBUTE) m.set(k, { ...emptyGrant, C: true, R: true, U: true })
  return Array.from(m, ([name, flags]) => ({ name, ...flags }))
}

const POSITION_MAP = {
  manager: { full: MODULES },
  cashier: { readOnly: READ_ONLY, contribute: CONTRIBUTE },
  warehouse: {
    readOnly: ['dashboard', 'category', 'unit', 'tag'],
    contribute: ['product', 'warehouse', 'provider', 'import-order', 'shift']
  },
  sales: {
    readOnly: ['dashboard', 'product', 'category', 'unit', 'tag', 'warehouse'],
    contribute: ['order', 'customer', 'invoice']
  },
  other: { readOnly: READ_ONLY, contribute: CONTRIBUTE }
}

const buildByPosition = (key) => {
  const preset = POSITION_MAP[key] || POSITION_MAP.other
  if (preset.full) return preset.full.map((name) => ({ name, C: true, R: true, U: true, D: false }))
  const g = new Map()
  for (const k of preset.readOnly) g.set(k, { ...emptyGrant, R: true })
  for (const k of preset.contribute) g.set(k, { ...emptyGrant, C: true, R: true, U: true })
  return Array.from(g, ([name, f]) => ({ name, ...f }))
}

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'System Administrator - Full access',
    isGlobal: true,
    isSystem: true,
    isAdmin: true,
    grants: MODULES.map((name) => ({ name, C: true, R: true, U: true, D: true }))
  },
  {
    name: 'Manager',
    description: 'Manager - Full management (no delete)',
    isGlobal: true,
    isSystem: true,
    isAdmin: false,
    grants: buildByPosition('manager')
  },
  {
    name: 'Staff',
    description: 'Nhân viên - Quyền cơ bản (bán hàng, khách hàng, hóa đơn, ca làm việc)',
    isGlobal: true,
    isSystem: true,
    isAdmin: false,
    grants: buildStaffPermissions()
  },
  {
    name: 'Cashier',
    description: 'Cashier - Sales operations',
    isGlobal: true,
    isSystem: true,
    isAdmin: false,
    grants: buildByPosition('cashier')
  },
  {
    name: 'Warehouse',
    description: 'Warehouse staff - Inventory management',
    isGlobal: true,
    isSystem: true,
    isAdmin: false,
    grants: buildByPosition('warehouse')
  },
  {
    name: 'Sales',
    description: 'Sales staff - Customer and order handling',
    isGlobal: true,
    isSystem: true,
    isAdmin: false,
    grants: buildByPosition('sales')
  }
]

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

const tableExists = async (queryInterface, tableName) => {
  try {
    const tables = await queryInterface.showAllTables()
    return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === tableName)
  } catch {
    return false
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()

    // Ensure roles table has system columns
    if ((await columnExists(queryInterface, 'roles', 'isSystem')) === false) {
      await queryInterface.addColumn('roles', 'isSystem', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
    if ((await columnExists(queryInterface, 'roles', 'isAdmin')) === false) {
      await queryInterface.addColumn('roles', 'isAdmin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
    if ((await columnExists(queryInterface, 'roles', 'isGlobal')) === false) {
      await queryInterface.addColumn('roles', 'isGlobal', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
    if (await columnExists(queryInterface, 'roles', 'position')) {
      await queryInterface.removeColumn('roles', 'position')
    }

    // Ensure permissions.method exists (final model: only method, no CRUD flags)
    if ((await columnExists(queryInterface, 'permissions', 'method')) === false) {
      await queryInterface.addColumn('permissions', 'method', {
        type: Sequelize.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE'),
        allowNull: true
      })
    }
    // Remove legacy CRUD columns from permissions (now only method)
    for (const col of ['C', 'R', 'U', 'D']) {
      if (await columnExists(queryInterface, 'permissions', col)) {
        await queryInterface.removeColumn('permissions', col)
      }
    }

    // Ensure unique index on (name,method)
    try {
      const [idx] = await queryInterface.sequelize
        .query("SHOW INDEX FROM `permissions` WHERE Key_name = 'permissions_name_method_unique'", {
          type: Sequelize.QueryTypes.SELECT
        })
        .catch(() => [null])
      if (!idx) {
        await queryInterface.sequelize
          .query(
            'DELETE p1 FROM `permissions` p1 INNER JOIN `permissions` p2 ON p1.name = p2.name AND p1.method = p2.method AND p1.id > p2.id'
          )
          .catch(() => {})
        await queryInterface
          .addIndex('permissions', ['name', 'method'], {
            name: 'permissions_name_method_unique',
            unique: true
          })
          .catch(() => {})
      }
    } catch {}

    // Seed Admin role id=1 explicitly (instant system role)
    const [existingAdminById] = await queryInterface.sequelize
      .query('SELECT id FROM `roles` WHERE id = 1 LIMIT 1', { type: Sequelize.QueryTypes.SELECT })
      .catch(() => [null])

    if (!existingAdminById) {
      await queryInterface.bulkInsert('roles', [
        {
          id: 1,
          name: 'Admin',
          description: 'System Administrator - Full access',
          vendorId: null,
          isGlobal: true,
          isSystem: true,
          isAdmin: true,
          createdAt: now,
          updatedAt: now
        }
      ])
    } else {
      await queryInterface.sequelize.query(
        'UPDATE `roles` SET `name`=:name, `description`=:description, `isGlobal`=1, `isSystem`=1, `isAdmin`=1, `updatedAt`=:now WHERE id=1',
        { replacements: { name: 'Admin', description: 'System Administrator - Full access', now } }
      )
    }

    // Seed 64 permissions: MODULES x METHODS (INSERT IGNORE)
    for (const mod of MODULES) {
      for (const method of METHODS) {
        await queryInterface.sequelize
          .query(
            'INSERT IGNORE INTO `permissions` (`name`,`description`,`method`,`createdAt`,`updatedAt`) VALUES (:name,:description,:method,:createdAt,:updatedAt)',
            {
              replacements: {
                name: mod,
                description: `${mod} - ${method}`,
                method,
                createdAt: now,
                updatedAt: now
              }
            }
          )
          .catch(async () => {
            const [existing] = await queryInterface.sequelize
              .query('SELECT id FROM `permissions` WHERE `name`=:name AND `method`=:method LIMIT 1', {
                replacements: { name: mod, method },
                type: Sequelize.QueryTypes.SELECT
              })
              .catch(() => [null])
            if (!existing) {
              await queryInterface.bulkInsert('permissions', [
                { name: mod, description: `${mod} - ${method}`, method, createdAt: now, updatedAt: now }
              ])
            }
          })
      }
    }

    // Seed all system roles (Admin already done, others by name)
    const hasRolePermissions = await tableExists(queryInterface, 'role_permissions')
    const hasCRUDFLags =
      hasRolePermissions &&
      (await columnExists(queryInterface, 'role_permissions', 'C')) &&
      (await columnExists(queryInterface, 'role_permissions', 'R'))

    for (const roleDef of DEFAULT_ROLES) {
      let roleId
      // Admin already has id 1
      if (roleDef.name === 'Admin') {
        roleId = 1
      } else {
        const [existing] = await queryInterface.sequelize
          .query('SELECT id FROM `roles` WHERE LOWER(name) = :name AND isGlobal = 1 LIMIT 1', {
            replacements: { name: roleDef.name.toLowerCase() },
            type: Sequelize.QueryTypes.SELECT
          })
          .catch(() => [null])
        if (existing && existing.id) {
          roleId = existing.id
          await queryInterface.sequelize.query(
            'UPDATE `roles` SET `isSystem`=1, `isGlobal`=1, `isAdmin`=:isAdmin, `description`=:desc, `updatedAt`=:now WHERE id=:id',
            {
              replacements: {
                isAdmin: roleDef.isAdmin ? 1 : 0,
                desc: roleDef.description,
                now,
                id: roleId
              }
            }
          )
        } else {
          await queryInterface.bulkInsert('roles', [
            {
              name: roleDef.name,
              description: roleDef.description,
              vendorId: null,
              isGlobal: true,
              isSystem: true,
              isAdmin: roleDef.isAdmin ? true : false,
              createdAt: now,
              updatedAt: now
            }
          ])
          const [created] = await queryInterface.sequelize.query(
            'SELECT id FROM `roles` WHERE LOWER(name) = :name AND isGlobal = 1 LIMIT 1',
            { replacements: { name: roleDef.name.toLowerCase() }, type: Sequelize.QueryTypes.SELECT }
          )
          if (!created) throw new Error(`Failed to create role ${roleDef.name}`)
          roleId = created.id
        }
      }

      if (!hasRolePermissions) continue

      // Create role_permissions links: one row per granted method
      for (const grant of roleDef.grants) {
        const methodMap = { C: 'CREATE', R: 'READ', U: 'UPDATE', D: 'DELETE' }
        for (const flag of ['C', 'R', 'U', 'D']) {
          if (!grant[flag]) continue
          const method = methodMap[flag]
          const [perm] = await queryInterface.sequelize
            .query('SELECT id FROM `permissions` WHERE `name`=:name AND `method`=:method LIMIT 1', {
              replacements: { name: grant.name, method },
              type: Sequelize.QueryTypes.SELECT
            })
            .catch(() => [null])
          if (!perm || !perm.id) continue
          const permId = perm.id

          const [link] = await queryInterface.sequelize
            .query('SELECT roleId FROM `role_permissions` WHERE roleId=:roleId AND permissionId=:permId LIMIT 1', {
              replacements: { roleId, permId },
              type: Sequelize.QueryTypes.SELECT
            })
            .catch(() => [null])

          if (!link) {
            if (hasCRUDFLags) {
              await queryInterface
                .bulkInsert('role_permissions', [
                  {
                    roleId,
                    permissionId: permId,
                    C: grant.C ? 1 : 0,
                    R: grant.R ? 1 : 0,
                    U: grant.U ? 1 : 0,
                    D: grant.D ? 1 : 0,
                    createdAt: now,
                    updatedAt: now
                  }
                ])
                .catch(async () => {
                  // Fallback if table has no C/R/U/D (new schema)
                  await queryInterface.sequelize
                    .query(
                      'INSERT IGNORE INTO `role_permissions` (`roleId`,`permissionId`,`createdAt`,`updatedAt`) VALUES (:roleId,:permId,:createdAt,:updatedAt)',
                      { replacements: { roleId, permId, createdAt: now, updatedAt: now } }
                    )
                    .catch(() => {})
                })
            } else {
              await queryInterface.sequelize
                .query(
                  'INSERT IGNORE INTO `role_permissions` (`roleId`,`permissionId`,`createdAt`,`updatedAt`) VALUES (:roleId,:permId,:createdAt,:updatedAt)',
                  { replacements: { roleId, permId, createdAt: now, updatedAt: now } }
                )
                .catch(() => {})
            }
          } else if (hasCRUDFLags) {
            await queryInterface.sequelize
              .query(
                'UPDATE `role_permissions` SET `C`=:C, `R`=:R, `U`=:U, `D`=:D, `updatedAt`=:now WHERE roleId=:roleId AND permissionId=:permId',
                {
                  replacements: {
                    C: grant.C ? 1 : 0,
                    R: grant.R ? 1 : 0,
                    U: grant.U ? 1 : 0,
                    D: grant.D ? 1 : 0,
                    now,
                    roleId,
                    permId
                  }
                }
              )
              .catch(() => {})
          }
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove all system role links and roles
    for (const roleDef of DEFAULT_ROLES) {
      const [role] = await queryInterface.sequelize
        .query('SELECT id FROM `roles` WHERE LOWER(name)=:name AND isSystem=1 LIMIT 1', {
          replacements: { name: roleDef.name.toLowerCase() },
          type: Sequelize.QueryTypes.SELECT
        })
        .catch(() => [null])
      if (role && role.id) {
        await queryInterface.sequelize
          .query('DELETE FROM `role_permissions` WHERE `roleId`=:id', { replacements: { id: role.id } })
          .catch(() => {})
        await queryInterface.sequelize
          .query('DELETE FROM `user_roles` WHERE `roleId`=:id', { replacements: { id: role.id } })
          .catch(() => {})
        await queryInterface.bulkDelete('roles', { id: role.id }, {})
      }
    }
    await queryInterface.bulkDelete(
      'permissions',
      { name: { [Sequelize.Op.in]: MODULES }, method: { [Sequelize.Op.in]: METHODS } },
      {}
    )
  }
}

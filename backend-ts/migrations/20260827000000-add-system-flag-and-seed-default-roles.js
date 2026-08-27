'use strict'

/**
 * Add `isSystem` flag to roles and seed default system roles (undeletable).
 * - Admin: full CRUD on all modules
 * - Manager: C/R/U on all modules (no D)
 * - Staff/Cashier/Warehouse/Sales/Other use previous presets
 */

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
    grants: MODULES.map((name) => ({ name, C: true, R: true, U: true, D: true }))
  },
  {
    name: 'Manager',
    description: 'Manager - Full management (no delete)',
    isGlobal: true,
    isSystem: true,
    grants: buildByPosition('manager')
  },
  {
    name: 'Staff',
    description: 'Nhân viên - Quyền cơ bản (bán hàng, khách hàng, hóa đơn, ca làm việc)',
    isGlobal: true,
    isSystem: true,
    grants: buildStaffPermissions()
  },
  {
    name: 'Cashier',
    description: 'Cashier - Sales operations',
    isGlobal: true,
    isSystem: true,
    grants: buildByPosition('cashier')
  },
  {
    name: 'Warehouse',
    description: 'Warehouse staff - Inventory management',
    isGlobal: true,
    isSystem: true,
    grants: buildByPosition('warehouse')
  },
  {
    name: 'Sales',
    description: 'Sales staff - Customer and order handling',
    isGlobal: true,
    isSystem: true,
    grants: buildByPosition('sales')
  }
]

const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'roles', 'isSystem'))) {
      await queryInterface.addColumn('roles', 'isSystem', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }
    if (await columnExists(queryInterface, 'roles', 'position')) {
      await queryInterface.removeColumn('roles', 'position')
    }

    const now = new Date()
    for (const roleDef of DEFAULT_ROLES) {
      const [existing] = await queryInterface.sequelize
        .query('SELECT id FROM roles WHERE LOWER(name) = :name AND isGlobal = 1 LIMIT 1', {
          replacements: { name: roleDef.name.toLowerCase() },
          type: Sequelize.QueryTypes.SELECT
        })
        .catch(() => [null])
      let roleId
      if (existing && existing.id) {
        roleId = existing.id
        // ensure isSystem flag set
        await queryInterface.sequelize.query('UPDATE roles SET isSystem = 1, isGlobal = 1 WHERE id = :id', {
          replacements: { id: roleId }
        })
      } else {
        await queryInterface.bulkInsert('roles', [
          {
            name: roleDef.name,
            description: roleDef.description,
            vendorId: null,
            isGlobal: true,
            isSystem: true,
            createdAt: now,
            updatedAt: now
          }
        ])
        const [created] = await queryInterface.sequelize.query(
          'SELECT id FROM roles WHERE LOWER(name) = :name AND isGlobal = 1 LIMIT 1',
          { replacements: { name: roleDef.name.toLowerCase() }, type: Sequelize.QueryTypes.SELECT }
        )
        if (!created) throw new Error(`Failed to create role ${roleDef.name}`)
        roleId = created.id
      }

      for (const grant of roleDef.grants) {
        let permId
        const [perm] = await queryInterface.sequelize
          .query('SELECT id FROM permissions WHERE name = :name LIMIT 1', {
            replacements: { name: grant.name },
            type: Sequelize.QueryTypes.SELECT
          })
          .catch(() => [null])
        if (perm && perm.id) {
          permId = perm.id
        } else {
          await queryInterface.bulkInsert('permissions', [
            {
              name: grant.name,
              description: null,
              createdAt: now,
              updatedAt: now
            }
          ])
          const [createdPerm] = await queryInterface.sequelize.query(
            'SELECT id FROM permissions WHERE name = :name LIMIT 1',
            { replacements: { name: grant.name }, type: Sequelize.QueryTypes.SELECT }
          )
          permId = createdPerm.id
        }
        const [link] = await queryInterface.sequelize
          .query(
            'SELECT roleId, permissionId FROM role_permissions WHERE roleId = :roleId AND permissionId = :permId LIMIT 1',
            { replacements: { roleId, permId }, type: Sequelize.QueryTypes.SELECT }
          )
          .catch(() => [null])
        if (!link || !link.roleId) {
          await queryInterface.bulkInsert('role_permissions', [
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
        } else {
          await queryInterface.sequelize.query(
            'UPDATE role_permissions SET `C`=:C, `R`=:R, `U`=:U, `D`=:D WHERE roleId=:roleId AND permissionId=:permId',
            {
              replacements: {
                C: grant.C ? 1 : 0,
                R: grant.R ? 1 : 0,
                U: grant.U ? 1 : 0,
                D: grant.D ? 1 : 0,
                roleId,
                permId
              }
            }
          )
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove system roles and their links (permissions kept if orphan logic elsewhere)
    for (const roleDef of DEFAULT_ROLES) {
      const [role] = await queryInterface.sequelize
        .query('SELECT id FROM roles WHERE LOWER(name)=:name AND isSystem=1 LIMIT 1', {
          replacements: { name: roleDef.name.toLowerCase() },
          type: Sequelize.QueryTypes.SELECT
        })
        .catch(() => [null])
      if (role && role.id) {
        await queryInterface.bulkDelete('role_permissions', { roleId: role.id }, {})
        await queryInterface.bulkDelete('user_roles', { roleId: role.id }, {})
        await queryInterface.bulkDelete('roles', { id: role.id }, {})
      }
    }
    if (await columnExists(queryInterface, 'roles', 'position')) {
      await queryInterface.removeColumn('roles', 'position')
    }
    // Keep column for safety; uncomment to drop
    // if (await columnExists(queryInterface,'roles','isSystem')) await queryInterface.removeColumn('roles','isSystem');
  }
}

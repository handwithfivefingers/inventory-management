'use strict'

/**
 * Refactor Staff and Transfer models:
 * - Staff: now belongsTo User, Vendor, Role (userId, vendorId, roleId) + warehouseId.
 *          Previously Staff belongedTo User/Warehouse and User belongedToMany Role.
 *          After this, Role is owned by Staff (staff.roleId) instead of User.
 * - Transfer: replace single `warehouseId` with `fromWarehouseId` + `toWarehouseId`
 *             (directional movement). Keeps productId/variantId/quantity.
 */

const columnExists = async (queryInterface, table, column) => {
  try {
    const desc = await queryInterface.describeTable(table)
    return Object.prototype.hasOwnProperty.call(desc, column)
  } catch {
    return false
  }
}

const addColumnIfMissing = async (queryInterface, table, column, spec) => {
  if (!(await columnExists(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, spec)
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Ensure `staff` table exists (init migration never created it; sync did)
    const tableExists = async (queryInterface, tableName) => {
      try {
        const tables = await queryInterface.showAllTables()
        return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === tableName)
      } catch {
        return false
      }
    }
    if (!(await tableExists(queryInterface, 'staff'))) {
      await queryInterface.createTable('staff', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING, allowNull: false, unique: true },
        fullName: { type: Sequelize.STRING, allowNull: false },
        gender: { type: Sequelize.ENUM('male', 'female', 'other'), allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        email: { type: Sequelize.STRING, allowNull: true },
        salary: { type: Sequelize.BIGINT, allowNull: true },
        hireDate: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
        address: { type: Sequelize.STRING, allowNull: true },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        vendorId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'vendors', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'warehouses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      })
    } else {
      // Add vendorId / roleId if missing on existing table
      await addColumnIfMissing(queryInterface, 'staff', 'vendorId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'vendors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      await addColumnIfMissing(queryInterface, 'staff', 'roleId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      await addColumnIfMissing(queryInterface, 'staff', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      if (await columnExists(queryInterface, 'staff', 'warehouseId')) {
        await queryInterface.removeColumn('staff', 'warehouseId')
      }
      if (await columnExists(queryInterface, 'staff', 'email')) {
        await queryInterface.removeColumn('staff', 'email')
      }
      // Backfill vendorId from warehouse when possible (best-effort, ignore errors on partial data)
      // try {
      //   await queryInterface.sequelize.query(`
      //     UPDATE staff s
      //     JOIN warehouses w ON w.id = s.warehouseId
      //     SET s.vendorId = w.vendorId
      //     WHERE s.vendorId IS NULL AND s.warehouseId IS NOT NULL AND w.vendorId IS NOT NULL
      //   `)
      // } catch {}
      // Backfill roleId for existing staff that have a user_role link (legacy User->Role)
      // Take MIN(roleId) per user to keep single-role invariant
      try {
        await queryInterface.sequelize.query(`
          UPDATE staff s
          JOIN (
            SELECT userId, MIN(roleId) as roleId FROM user_roles GROUP BY userId
          ) ur ON ur.userId = s.userId
          SET s.roleId = ur.roleId
          WHERE s.roleId IS NULL AND s.userId IS NOT NULL
        `)
      } catch {}
    }

    // Add indexes for new FKs (idempotent)
    try {
      await queryInterface.addIndex('staff', ['vendorId'], { name: 'staff_vendorId_idx' })
    } catch {}
    try {
      await queryInterface.addIndex('staff', ['roleId'], { name: 'staff_roleId_idx' })
    } catch {}
    try {
      await queryInterface.addIndex('staff', ['userId'], { name: 'staff_userId_idx' })
    } catch {}

    // 2. Refactor transfers: warehouseId -> fromWarehouseId / toWarehouseId
    if (await tableExists(queryInterface, 'transfers')) {
      // Ensure new directional columns exist
      await addColumnIfMissing(queryInterface, 'transfers', 'fromWarehouseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'warehouses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      await addColumnIfMissing(queryInterface, 'transfers', 'toWarehouseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'warehouses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      // Ensure type/status exist (legacy handling)
      await addColumnIfMissing(queryInterface, 'transfers', 'type', {
        type: Sequelize.ENUM('0', '1'),
        allowNull: true
      })
      await addColumnIfMissing(queryInterface, 'transfers', 'status', {
        type: Sequelize.STRING,
        allowNull: true
      })

      // If legacy warehouseId column exists, migrate its data to fromWarehouseId
      if (await columnExists(queryInterface, 'transfers', 'warehouseId')) {
        try {
          await queryInterface.sequelize.query(`
            UPDATE transfers SET fromWarehouseId = warehouseId WHERE fromWarehouseId IS NULL AND warehouseId IS NOT NULL
          `)
        } catch {}
        // Drop legacy column after migration (keep for rollback)
        try {
          await queryInterface.removeColumn('transfers', 'warehouseId')
        } catch {}
      }

      try {
        await queryInterface.addIndex('transfers', ['fromWarehouseId'], { name: 'transfers_fromWarehouseId_idx' })
      } catch {}
      try {
        await queryInterface.addIndex('transfers', ['toWarehouseId'], { name: 'transfers_toWarehouseId_idx' })
      } catch {}
    }
    if (await columnExists(queryInterface, 'users', 'nickname')) {
      await queryInterface.removeColumn('users', 'nickname')
    }
    if (await columnExists(queryInterface, 'users', 'firstName')) {
      await queryInterface.removeColumn('users', 'firstName')
    }
    if (await columnExists(queryInterface, 'users', 'lastName')) {
      await queryInterface.removeColumn('users', 'lastName')
    }
    if (await columnExists(queryInterface, 'users', 'userId')) {
      await queryInterface.removeColumn('users', 'userId')
    }
  },

  async down(queryInterface, Sequelize) {
    const tableExists = async (queryInterface, tableName) => {
      try {
        const tables = await queryInterface.showAllTables()
        return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === tableName)
      } catch {
        return false
      }
    }
    // Reverse transfer refactoring: restore warehouseId from fromWarehouseId
    if (await tableExists(queryInterface, 'transfers')) {
      await addColumnIfMissing(queryInterface, 'transfers', 'warehouseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'warehouses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
      try {
        await queryInterface.sequelize.query(`
          UPDATE transfers SET warehouseId = fromWarehouseId WHERE warehouseId IS NULL AND fromWarehouseId IS NOT NULL
        `)
      } catch {}
      // Keep directional columns for safety; uncomment to drop
      // if (await columnExists(queryInterface,'transfers','fromWarehouseId')) await queryInterface.removeColumn('transfers','fromWarehouseId');
      // if (await columnExists(queryInterface,'transfers','toWarehouseId')) await queryInterface.removeColumn('transfers','toWarehouseId');
    }

    // Reverse staff: keep columns for safety; uncomment to drop
    // if (await columnExists(queryInterface,'staff','roleId')) await queryInterface.removeColumn('staff','roleId');
    // if (await columnExists(queryInterface,'staff','vendorId')) await queryInterface.removeColumn('staff','vendorId');
  }
}

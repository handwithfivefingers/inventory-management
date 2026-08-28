'use strict';

/**
 * Option B: keep User.hasOne(Staff) but allow one staff profile to span
 * multiple vendors via M:N join table `staff_vendor`.
 * - Creates `staff_vendor` (staffId, vendorId, roleId?) matching
 *   Staff.belongsToMany(Vendor, {through:'staff_vendor', as:'vendors'})
 *   in backend-ts/src/database/models/staff.ts:92
 * - Backfills existing staff.vendorId into the join table so sync/alter
 *   never loses the current single-vendor assignment.
 * - Keeps staff.vendorId column for backward compat (remove later if desired).
 */

const tableName = 'staff_vendor';

const tableExists = async (queryInterface, name) => {
  try {
    const tables = await queryInterface.showAllTables();
    return tables.some((t) => (typeof t === 'string' ? t : t.tableName || t.name) === name);
  } catch {
    return false;
  }
};

const columnExists = async (queryInterface, table, column) => {
  try {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch {
    return false;
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create join table if missing — simple: only staffId+vendorId, role lives on staff.roleId
    if (!(await tableExists(queryInterface, tableName))) {
      await queryInterface.createTable(tableName, {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        staffId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'staff', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        vendorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'vendors', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });
    }

    // 2. Indexes / unique constraint (staffId, vendorId) = one row per assignment
    try {
      await queryInterface.addIndex(tableName, ['staffId'], { name: 'staff_vendor_staffId_idx' });
    } catch {}
    try {
      await queryInterface.addIndex(tableName, ['vendorId'], { name: 'staff_vendor_vendorId_idx' });
    } catch {}
    try {
      await queryInterface.addConstraint(tableName, {
        fields: ['staffId', 'vendorId'],
        type: 'unique',
        name: 'staff_vendor_unique',
      });
    } catch {}

    // 3. Backfill from legacy staff.vendorId
    if ((await tableExists(queryInterface, 'staff')) && (await columnExists(queryInterface, 'staff', 'vendorId'))) {
      try {
        await queryInterface.sequelize.query(`
          INSERT INTO \`${tableName}\` (staffId, vendorId, createdAt, updatedAt)
          SELECT s.id, s.vendorId, NOW(), NOW()
          FROM staff s
          WHERE s.vendorId IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM \`${tableName}\` sv
              WHERE sv.staffId = s.id AND sv.vendorId = s.vendorId
            )
        `);
      } catch (e) {
        console.log('staff_vendor backfill legacy skipped', e.message);
      }
    }

    // 3b. Create missing staff for owners who have vendors but no staff row
    // (register flow never created staff — owner would be orphaned after dropping staff.vendorId)
    try {
      // find global Admin role to assign owner staff
      const rolesResult = await queryInterface.sequelize.query(`SELECT id FROM roles WHERE isGlobal = 1 ORDER BY id LIMIT 1`);
      const rows = rolesResult[0];
      const adminRoleId = rows && rows[0] ? rows[0].id : null;
      // generate code as NV-OWNER-<userId> to avoid sequence collision; unique constraint on staff.code will guard
      await queryInterface.sequelize.query(`
        INSERT INTO staff (code, fullName, status, userId, roleId, createdAt, updatedAt)
        SELECT 
          CONCAT('NV-OWNER-', LPAD(u.id,4,'0')),
          COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(u.email,'@',1)),''), CONCAT('Owner ', u.id)),
          'active',
          u.id,
          ${adminRoleId ? adminRoleId : 'NULL'},
          NOW(), NOW()
        FROM users u
        JOIN vendors v ON v.userId = u.id
        LEFT JOIN staff s ON s.userId = u.id
        WHERE s.id IS NULL
        GROUP BY u.id
      `);
    } catch (e) {
      console.log('staff creation for orphan owners skipped', e.message);
    }

    // 4. Backfill vendors owned via vendors.userId for owner accounts
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO \`${tableName}\` (staffId, vendorId, createdAt, updatedAt)
        SELECT s.id, v.id, NOW(), NOW()
        FROM staff s
        JOIN vendors v ON v.userId = s.userId
        WHERE s.userId IS NOT NULL AND v.id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM \`${tableName}\` sv
            WHERE sv.staffId = s.id AND sv.vendorId = v.id
          )
      `);
    } catch (e) {
      console.log('staff_vendor owner backfill skipped', e.message);
    }

    // 5. Verify: log counts and warn if any staff still orphaned or vendor orphaned
    try {
      const staffRes = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM staff`);
      const vendorRes = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM vendors`);
      const linkRes = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM \`${tableName}\``);
      const orphanStaffRes = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as c FROM staff s LEFT JOIN \`${tableName}\` sv ON sv.staffId = s.id WHERE sv.staffId IS NULL
      `);
      const orphanVendorRes = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as c FROM vendors v LEFT JOIN \`${tableName}\` sv ON sv.vendorId = v.id WHERE sv.vendorId IS NULL
      `);
      const staffCount = staffRes[0][0];
      const vendorCount = vendorRes[0][0];
      const linkCount = linkRes[0][0];
      const orphanStaff = orphanStaffRes[0][0];
      const orphanVendor = orphanVendorRes[0][0];
      console.log(`[staff_vendor migrate] staff=${staffCount.c} vendors=${vendorCount.c} links=${linkCount.c} orphanStaff=${orphanStaff.c} orphanVendor=${orphanVendor.c}`);
      if (orphanVendor.c > 0) console.warn(`WARNING: ${orphanVendor.c} vendors have no staff_vendor link (no owner staff?)`);
    } catch {}
  },

  async down(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, tableName)) {
      await queryInterface.dropTable(tableName);
    }
  },
};

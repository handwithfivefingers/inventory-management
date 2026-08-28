'use strict';

/**
 * Clean migration for Option B (not production):
 * - Drops legacy staff.vendorId column (now via staff_vendor M:N)
 * - Keeps vendors.userId (owner) — drop only if you want vendor independent.
 *   Uncomment the vendors.userId block to remove ownership FK entirely.
 */

const columnExists = async (queryInterface, table, column) => {
  try {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch { return false; }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verify data migrated before dropping — re-run backfill if needed (idempotent)
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO staff_vendor (staffId, vendorId, createdAt, updatedAt)
        SELECT s.id, s.vendorId, NOW(), NOW()
        FROM staff s
        WHERE s.vendorId IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM staff_vendor sv WHERE sv.staffId = s.id AND sv.vendorId = s.vendorId)
      `);
    } catch {}
    try {
      const res = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as c FROM staff s LEFT JOIN staff_vendor sv ON sv.staffId = s.id WHERE sv.staffId IS NULL AND s.vendorId IS NOT NULL
      `);
      const orphan = res[0][0];
      if (orphan.c > 0) console.warn(`[clean] still ${orphan.c} staff.vendorId not migrated before drop`);
    } catch {}

    // 1. Drop staff.vendorId — already backfilled to staff_vendor in  ...00001
    if (await columnExists(queryInterface, 'staff', 'vendorId')) {
      try { await queryInterface.removeColumn('staff', 'vendorId'); } catch {}
    }
    // Remove legacy index if exists
    try { await queryInterface.removeIndex('staff', 'staff_vendorId_idx'); } catch {}

    // 2. OPTIONAL: drop vendors.userId if you want pure M:N (no owner FK)
    // Uncomment to make vendor independent — ownership then via staff_vendor + staff.userId
    // if (await columnExists(queryInterface, 'vendors', 'userId')) {
    //   try { await queryInterface.removeColumn('vendors', 'userId'); } catch {}
    // }
  },

  async down(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'staff', 'vendorId'))) {
      await queryInterface.addColumn('staff', 'vendorId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'vendors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      try { await queryInterface.addIndex('staff', ['vendorId'], { name: 'staff_vendorId_idx' }); } catch {}
      // re-backfill from staff_vendor (pick first vendor per staff)
      try {
        await queryInterface.sequelize.query(`
          UPDATE staff s
          JOIN (SELECT staffId, MIN(vendorId) as vendorId FROM staff_vendor GROUP BY staffId) sv ON sv.staffId = s.id
          SET s.vendorId = sv.vendorId
          WHERE s.vendorId IS NULL
        `);
      } catch {}
    }
    // if you dropped vendors.userId, restore it here
    // if (!(await columnExists(queryInterface, 'vendors', 'userId'))) {
    //   await queryInterface.addColumn('vendors', 'userId', { type: Sequelize.INTEGER, allowNull: true, references: {model:'users',key:'id'}, onUpdate:'CASCADE', onDelete:'SET NULL' });
    // }
  },
};

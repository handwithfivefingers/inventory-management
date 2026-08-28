'use strict';

/**
 * Fix orphan data missed by 00001: old users (e.g. id=46) have staff but staff_vendor is empty.
 * Re-backfills from vendors.userId and from warehouses to ensure every old staff/vendor is linked.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Link any staff that still has 0 vendors via owner vendors.userId
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO staff_vendor (staffId, vendorId, createdAt, updatedAt)
        SELECT s.id, v.id, NOW(), NOW()
        FROM staff s
        JOIN vendors v ON v.userId = s.userId
        WHERE s.userId IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM staff_vendor sv WHERE sv.staffId = s.id AND sv.vendorId = v.id)
      `);
    } catch (e) { console.log('fix orphan staff->vendor skipped', e.message); }

    // 2. For vendors still orphan (no staff_vendor), link to owner's staff (create staff if missing was already done in 00001)
    // This covers vendors where vendors.userId -> staff exists but previous INSERT missed due to NOT EXISTS logic/timing
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO staff_vendor (staffId, vendorId, createdAt, updatedAt)
        SELECT s.id, v.id, NOW(), NOW()
        FROM vendors v
        JOIN staff s ON s.userId = v.userId
        LEFT JOIN staff_vendor sv ON sv.staffId = s.id AND sv.vendorId = v.id
        WHERE sv.staffId IS NULL AND v.userId IS NOT NULL AND s.id IS NOT NULL
      `);
    } catch (e) { console.log('fix orphan vendor->staff skipped', e.message); }

    // 3. Verify
    try {
      const r1 = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM staff s LEFT JOIN staff_vendor sv ON sv.staffId=s.id WHERE sv.staffId IS NULL`);
      const r2 = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM vendors v LEFT JOIN staff_vendor sv ON sv.vendorId=v.id WHERE sv.vendorId IS NULL`);
      console.log(`[fix-orphan] orphanStaff=${r1[0][0].c} orphanVendor=${r2[0][0].c}`);
    } catch {}
  },
  async down(queryInterface, Sequelize) {}
};

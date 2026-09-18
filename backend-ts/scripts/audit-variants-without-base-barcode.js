'use strict'

/**
 * One-off legacy-data audit. It does not modify data.
 *
 * Usage: node scripts/audit-variants-without-base-barcode.js
 * DB_* environment variables and database.json follow the same convention as
 * the existing seed scripts.
 */
const path = require('path')
const { Sequelize } = require('sequelize')

const configs = require(path.join(__dirname, '..', 'src', 'configs', 'database.json'))
const config = configs[process.env.NODE_ENV || 'development'] || configs.development
const sequelize = new Sequelize(process.env.DB_NAME || config.database, process.env.DB_USER || config.username, process.env.DB_PASSWORD || config.password, {
  host: process.env.DB_HOST || config.host,
  port: Number(process.env.DB_PORT || config.port || 3306),
  dialect: config.dialect,
  logging: false
})

async function main() {
  const [rows] = await sequelize.query(`
    SELECT pv.id AS variantId, pv.productId, pv.skuCode
    FROM productVariants pv
    LEFT JOIN product_barcodes pb ON pb.variantId = pv.id AND pb.conversionRate = 1
    WHERE pv.deletedAt IS NULL
    GROUP BY pv.id, pv.productId, pv.skuCode
    HAVING COUNT(pb.id) = 0
    ORDER BY pv.id ASC
  `)
  console.table(rows)
  console.log(`[audit] ${rows.length} variant(s) without a base barcode`)
}

main().catch((error) => {
  console.error('[audit] failed:', error.message)
  process.exitCode = 1
}).finally(() => sequelize.close())

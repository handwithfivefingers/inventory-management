// const { Sequelize } = require('sequelize')
// const fs = require('fs')
// const path = require('path')
import { Sequelize, DataTypes, Transaction } from 'sequelize'
import { Sequelize as STSequelize, Model as STModel } from 'sequelize-typescript'
import fs from 'node:fs'
import path from 'node:path'
import { IDatabase } from '#/types/database'
const basename = path.basename(__filename)

const dbName = process.env.DB_NAME || 'inventory'

// Resolve model folder for both src (tsx) and dist (node) runs.
// `process.cwd()/src/...` exists when running via tsx, `dist/...` when running built JS.
const resolveModelsPath = () => {
  // When running from dist (node dist/index.js), __dirname is .../dist/database
  // so we must prefer the compiled models over the TS source.
  const isDist = __filename.includes(`${path.sep}dist${path.sep}`) || __dirname.includes(`${path.sep}dist`)
  const candidates = isDist
    ? [
        path.join(__dirname, 'models'),
        path.join(process.cwd(), 'dist', 'database', 'models'),
        path.join(process.cwd(), 'src', 'database', 'models')
      ]
    : [
        path.join(process.cwd(), 'src', 'database', 'models'),
        path.join(__dirname, 'models'),
        path.join(process.cwd(), 'dist', 'database', 'models')
      ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p
    } catch {}
  }
  return path.join(process.cwd(), 'src', 'database', 'models')
}
const folderPath = resolveModelsPath()

// SECURITY: credentials come from env vars (DB_USER / DB_PASSWORD / DB_HOST).
// The previous hardcoded root/mysql defaults remain ONLY as a local-dev
// fallback - production must set the DB_* variables.
// Use sequelize-typescript's Sequelize so @Table decorators are processed.
// It extends the base Sequelize class - all options remain compatible.
const sequelize: Sequelize = new STSequelize({
  database: dbName,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  pool: {
    max: Number(process.env.DB_POOL_MAX || 20),
    min: 2,
    acquire: 10000,
    idle: 10000
  },
  define: {
    charset: 'utf8',
    collate: 'utf8_general_ci',
    timestamps: true
  },
  // Keep it empty if your load() function feeds models later
  models: []
})

const dedupeInvoiceIndexes = async () => {
  // sync({alter:true}) on MySQL creates duplicate UNIQUE indexes for
  // invoiceNumber/code columns (one per boot) until hitting the 64-key limit.
  // Clean them before sync so alter doesn't hit ER_TOO_MANY_KEYS.
  const dedupeTable = async (table: string, keepNames: string[], columnPattern?: RegExp) => {
    try {
      const [rows] = (await sequelize.query(`SHOW INDEX FROM \`${table}\``)) as any
      if (!Array.isArray(rows) || rows.length === 0) return
      const byKey = new Map<string, any[]>()
      for (const r of rows) {
        const k = r.Key_name
        if (!byKey.has(k)) byKey.set(k, [])
        byKey.get(k)!.push(r)
      }
      // Keep the canonical indexes, drop duplicated ones that match pattern
      for (const [key, cols] of byKey) {
        if (keepNames.includes(key)) continue
        if (columnPattern && !columnPattern.test(key)) continue
        // Only drop single-column unique indexes that look like duplicated alters
        // (e.g. invoiceNumber_2, code_2). Keep FK indexes.
        try {
          await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${key}\``)
          console.log(`dropped duplicate index ${table}.${key}`)
        } catch {}
      }
    } catch {}
  }
  await dedupeTable(
    'invoices',
    ['PRIMARY', 'invoiceNumber', 'orderId', 'customerId', 'vendorId', 'warehouseId'],
    /^invoiceNumber/
  )
  await dedupeTable('staff', ['PRIMARY', 'staff_code_unique', 'code', 'userId', 'warehouseId'], /^code/)
  await dedupeTable('products', ['PRIMARY', 'products_code_unique', 'code', 'vendorId', 'unitId'], /^code/)
  await dedupeTable('permissions', ['PRIMARY', 'name'], /^name/)
  // await dedupeTable('staff_vendor', ['PRIMARY', 'staffId'], /^staffId/)
}

const database: IDatabase = {
  sync: async () => {
    try {
      if (process.env.NODE_ENV === 'production') {
        // P2: schema-diff DDL (sync({alter:true})) never runs against prod -
        // migrations are the only schema path there.
        console.log(`Database \x1b[33m${dbName}\x1b[0m sync skipped in production (use migrations)`)
        return true
      }
      await dedupeInvoiceIndexes()
      // alter: true keeps the schema in step with model changes in dev
      // (e.g. the per-variant isNegative column added to productVariants).
      try {
        await sequelize.sync({ alter: true })
      } catch (e: any) {
        // ER_TOO_MANY_KEYS is the duplicate-index fallout - clean and retry once
        if (e?.parent?.code === 'ER_TOO_MANY_KEYS' || String(e?.message ?? '').includes('Too many keys')) {
          console.log('sync hit Too many keys - retrying after dedupe')
          await dedupeInvoiceIndexes()
          await sequelize.sync({ alter: true })
        } else {
          throw e
        }
      }
      // Post-sync dedupe: alter may have recreated a duplicate unique index
      // (e.g. invoiceNumber_2) even when one already existed. Clean again.
      await dedupeInvoiceIndexes()
      console.log(`Database \x1b[33m${dbName}\x1b[0m has been established successfully`)
      return true
    } catch (error) {
      console.log(`Unable to connect to the \x1b[33m${dbName}\x1b[0m`, error)
      return false
    }
  },
  connect: async () => {
    try {
      await sequelize.authenticate()
      console.log('Database Connection has been established successfully')
      return true
    } catch (error) {
      console.log(`Unable to connect to the \x1b[33m${dbName}\x1b[0m`, error)
      return false
    }
  },
  sequelize: sequelize,
  load: load
}

async function load(): Promise<void> {
  try {
    const listModels = fs.readdirSync(folderPath).filter((file) => {
      return file.indexOf('.') !== 0 && file !== basename && ['.ts', '.js'].includes(file.slice(-3))
    })

    const stModels: (typeof STModel)[] = []

    for (let i = 0; i < listModels.length; i++) {
      const file = listModels[i]
      const _mod = await import(path.join(folderPath, file))
      const exported = (_mod.default ?? _mod[Object.keys(_mod)[0]]) as any

      // Detect sequelize-typescript Model subclass (has @Table decorator)
      const isSTModel =
        exported?.prototype instanceof STModel || (exported?.prototype && typeof exported?.getTableName === 'function')

      if (isSTModel) {
        stModels.push(exported)
      } else if (typeof exported === 'function') {
        // Legacy define-style factory: (sequelize, DataTypes) => Model
        try {
          const model = exported(sequelize, DataTypes)
          if (model?.name) {
            database[model.name] = model
            // also expose capitalized alias for forward compat
            const cap = model.name.charAt(0).toUpperCase() + model.name.slice(1)
            if (!database[cap]) database[cap] = model
          }
        } catch (e) {
          console.log(`[load] failed legacy model ${file}:`, e)
        }
      }
    }

    // Register all sequelize-typescript models at once (resolves cross-FK)
    if (stModels.length) {
      ;(sequelize as any).addModels(stModels)
      // After addModels, models are available via sequelize.models / sequelize.model()
      for (const M of stModels) {
        const name = (M as any).name // class name e.g. Unit
        // modelName option gives lower-case name; prefer that key
        const modelName = (M as any).getTableName ? (M as any).options?.modelName || (M as any).name : name
        // Try to retrieve initialized model from sequelize
        let instance: any
        try {
          instance = (sequelize as any).model(M)
        } catch {
          instance = M
        }
        // Expose under both lower-case (legacy) and class name
        if (instance) {
          const lower =
            String(modelName).toLowerCase() === String(name).toLowerCase() ? String(modelName) : String(modelName)
          // sequelize-typescript stores modelName as defined; use it
          const keyLower = String((M as any).options?.modelName || name).toLowerCase()
          // Actually expose under the canonical lower-case key (e.g. 'unit')
          const canonical = (M as any).options?.modelName || name.charAt(0).toLowerCase() + name.slice(1)
          database[canonical] = instance
          // Keep class-name alias as well
          if (!database[name]) database[name] = instance
          // Also expose lower-case fallback
          const lc = name.charAt(0).toLowerCase() + name.slice(1)
          if (!database[lc]) database[lc] = instance
        }
      }
    }

    // All associations are now defined via decorators (@BelongsTo, @HasMany, @BelongsToMany, etc.)
    // No manual associate() calls needed - addModels() already wired them.
    console.log(`Table schema loaded successfully (${stModels.length} ST)`)
  } catch (error) {
    console.log('error', error)
  }
}

export default database

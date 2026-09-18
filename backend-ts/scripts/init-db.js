'use strict'

/**
 * Minimal first-install bootstrap.
 *
 * A plain migration cannot create the database it connects to (MySQL refuses
 * the connection when the schema is missing), so this script connects to the
 * server WITHOUT a database and:
 *
 *   1. `CREATE DATABASE IF NOT EXISTS` with utf8mb4/utf8mb4_unicode_ci.
 *   2. Optionally runs the migrations (`--migrate`).
 *   3. Optionally seeds demo data (`--seed`, implies --migrate).
 *   4. Optionally drops ONLY_FULL_GROUP_BY from the global sql_mode
 *      (`--sql-mode`) - the app queries need it (see AGENTS.md).
 *
 * Usage:
 *   node scripts/init-db.js                  # create database only
 *   node scripts/init-db.js --migrate        # create + migrate
 *   node scripts/init-db.js --seed           # create + migrate + seed
 *   node scripts/init-db.js --env production # other Sequelize env block
 *
 * Config is resolved from src/configs/database.json, overridden by the DB_*
 * env vars (same precedence as src/configs/database.js).
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { Sequelize } = require('sequelize')

const CONFIG_PATH = path.join(__dirname, '..', 'src', 'configs', 'database.json')
const BACKEND_ROOT = path.join(__dirname, '..')

// Exported for unit tests (entry only runs when invoked directly).
const parseArgs = (argv = process.argv.slice(2)) => {
  const args = new Set(argv)
  const envArg = argv.find((a) => a.startsWith('--env='))
  return {
    migrate: args.has('--migrate') || args.has('--seed'),
    seed: args.has('--seed'),
    sqlMode: args.has('--sql-mode'),
    env: envArg ? envArg.split('=')[1] : 'development',
    help: args.has('--help') || args.has('-h')
  }
}

const readConfigs = () => {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const resolveDbConfig = (env) => {
  const configs = readConfigs()
  const base = configs[env] || configs.development || {}
  return {
    database: process.env.DB_NAME || base.database || 'inventory',
    username: process.env.DB_USER || base.username || 'root',
    password: process.env.DB_PASSWORD || base.password || 'mysql',
    host: process.env.DB_HOST || base.host || 'localhost',
    port: Number(process.env.DB_PORT || base.port || 3306),
    dialect: base.dialect || 'mysql'
  }
}

const buildCreateDatabaseSql = (dbName) =>
  `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`

const buildSqlModeSql = () =>
  "SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));"

const run = (cmd, args, env) => {
  const executable = process.platform === 'win32' ? `${cmd}.cmd` : cmd
  const result = spawnSync(executable, args, {
    cwd: BACKEND_ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with status ${result.status}`)
  }
}

const createDatabase = async (cfg) => {
  const sequelize = new Sequelize(null, cfg.username, cfg.password, {
    host: cfg.host,
    port: cfg.port,
    dialect: cfg.dialect,
    logging: false,
    dialectOptions: { charset: 'utf8mb4' }
  })
  try {
    await sequelize.authenticate()
  } catch (err) {
    console.error(`[init-db] Cannot reach MySQL at ${cfg.host}:${cfg.port} (${cfg.username}@${cfg.database}):`, err.message)
    throw err
  }
  try {
    await sequelize.query(buildCreateDatabaseSql(cfg.database))
    console.log(`[init-db] database "${cfg.database}" is ready (created if missing)`)
  } finally {
    await sequelize.close()
  }
}

const applySqlMode = async (cfg) => {
  const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
    host: cfg.host,
    port: cfg.port,
    dialect: cfg.dialect,
    logging: false
  })
  try {
    await sequelize.query(buildSqlModeSql())
    console.log('[init-db] ONLY_FULL_GROUP_BY removed from global sql_mode')
  } finally {
    await sequelize.close()
  }
}

const printUsage = () => {
  console.log(`
Usage: node scripts/init-db.js [options]

Options:
  --migrate       create database then run sequelize-cli db:migrate
  --seed          imply --migrate and run scripts/run-seeds.js up
  --sql-mode      also strip ONLY_FULL_GROUP_BY from global sql_mode
  --env=<env>     Sequelize config env block (default: development)
  -h, --help      show this help

Defaults resolve from DB_* environment variables, falling back to
src/configs/database.json.
`)
}

const main = async () => {
  const { migrate, seed, sqlMode, env, help } = parseArgs()
  if (help) {
    printUsage()
    return
  }

  const cfg = resolveDbConfig(env)
  await createDatabase(cfg)

  if (sqlMode) {
    await applySqlMode(cfg)
  }

  if (migrate) {
    run('npx', ['sequelize-cli', 'db:migrate', '--env', env], { NODE_ENV: env })
    console.log('[init-db] migrations up to date')
  }

  if (seed) {
    run('node', ['scripts/run-seeds.js', 'up', '--env=' + env], { NODE_ENV: env })
    console.log('[init-db] seeders applied')
  }

  console.log('[init-db] done')
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[init-db] failed:', err.message || err)
    process.exit(1)
  })
}

module.exports = { parseArgs, resolveDbConfig, buildCreateDatabaseSql, buildSqlModeSql, main }
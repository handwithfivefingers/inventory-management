'use strict'

/**
 * Minimal Sequelize seed runner.
 *
 * Runs the plain-JS seeders in `seeders/` using the installed `sequelize`
 * library directly (no sequelize-cli, no model loading). Each seeder exports
 * `{ up(queryInterface, Sequelize), down(queryInterface, Sequelize) }` and only
 * uses `queryInterface`/raw SQL, so it works without compiling the TS models.
 *
 * Usage:
 *   node scripts/run-seeds.js up       # default: run all seeders in order
 *   node scripts/run-seeds.js down     # undo in reverse order
 *   node scripts/run-seeds.js up --env production
 */

const fs = require('fs')
const path = require('path')
const { Sequelize } = require('sequelize')

const SEEDERS_DIR = path.join(__dirname, '..', 'seeders')
const CONFIG_PATH = path.join(__dirname, '..', 'src', 'configs', 'database.json')

const getConfig = (env) => {
  const configs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  return configs[env] || configs.development
}

const listSeeders = () =>
  fs
    .readdirSync(SEEDERS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort()

const main = async () => {
  const direction = process.argv[2] === 'down' ? 'down' : 'up'
  const envArg = process.argv.find((a) => a.startsWith('--env='))
  const env = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development'

  const cfg = getConfig(env)
  const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
    host: cfg.host,
    dialect: cfg.dialect,
    logging: false
  })

  try {
    await sequelize.authenticate()
  } catch (err) {
    console.error(`[run-seeds] Cannot connect to database (env="${env}"):`, err.message)
    process.exit(1)
  }

  const queryInterface = sequelize.getQueryInterface()
  let files = listSeeders()
  if (direction === 'down') files = files.reverse()

  for (const file of files) {
    const mod = require(path.join(SEEDERS_DIR, file))
    const fn = mod[direction]
    if (typeof fn !== 'function') {
      console.log(`[run-seeds] ${file}: no ${direction} export, skipping`)
      continue
    }
    console.log(`[run-seeds] ${direction === 'up' ? 'seeding' : 'reverting'} ${file}`)
    await fn(queryInterface, Sequelize)
  }

  console.log(`[run-seeds] done (${direction})`)
  await sequelize.close()
}

main().catch((err) => {
  console.error('[run-seeds] failed:', err)
  process.exit(1)
})

import { afterEach, describe, expect, it, vi } from 'vitest'
// Plain CJS script loaded through Vite's interop (default export holds module.exports).
// @ts-ignore: untyped CJS bootstrap module
import initDbModule from '../../../scripts/init-db.js'

const initDb: any = (initDbModule as any).default ?? initDbModule

const DB_ENV_KEYS = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']

describe('scripts/init-db.js helpers', () => {
  afterEach(() => {
    for (const key of DB_ENV_KEYS) vi.unstubAllEnvs()
  })

  it('parseArgs defaults to development without flags', () => {
    expect(initDb.parseArgs([])).toEqual({
      migrate: false,
      seed: false,
      sqlMode: false,
      env: 'development',
      help: false
    })
  })

  it('parseArgs --seed implies --migrate', () => {
    expect(initDb.parseArgs(['--seed', '--sql-mode'])).toEqual({
      migrate: true,
      seed: true,
      sqlMode: true,
      env: 'development',
      help: false
    })
  })

  it('parseArgs --migrate keeps seed disabled and honours --env', () => {
    expect(initDb.parseArgs(['--migrate', '--env=production'])).toEqual({
      migrate: true,
      seed: false,
      sqlMode: false,
      env: 'production',
      help: false
    })
  })

  it('parseArgs --help short-circuits', () => {
    expect(initDb.parseArgs(['--help']).help).toBe(true)
  })

  it('resolveDbConfig falls back to src/configs/database.json (development)', () => {
    vi.stubEnv('DB_NAME', '')
    expect(initDb.resolveDbConfig('development')).toEqual({
      database: 'inventory',
      username: 'root',
      password: 'mysql',
      host: 'localhost',
      port: 3306,
      dialect: 'mysql'
    })
  })

  it('resolveDbConfig honours DB_* environment variables', () => {
    vi.stubEnv('DB_NAME', 'app_db')
    vi.stubEnv('DB_USER', 'app_user')
    vi.stubEnv('DB_PASSWORD', 'app_pass')
    vi.stubEnv('DB_HOST', 'db.internal')
    vi.stubEnv('DB_PORT', '3307')

    expect(initDb.resolveDbConfig('development')).toEqual({
      database: 'app_db',
      username: 'app_user',
      password: 'app_pass',
      host: 'db.internal',
      port: 3307,
      dialect: 'mysql'
    })
  })

  it('buildCreateDatabaseSql quotes the name and sets utf8mb4', () => {
    expect(initDb.buildCreateDatabaseSql('inventory')).toBe(
      'CREATE DATABASE IF NOT EXISTS `inventory` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    )
  })

  it('buildSqlModeSql removes ONLY_FULL_GROUP_BY globally', () => {
    expect(initDb.buildSqlModeSql()).toBe(
      "SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));"
    )
  })
})
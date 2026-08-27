// Sequelize CLI config - reads DB_* env vars with same defaults as src/database/index.ts
// This keeps `npx sequelize-cli db:migrate` in sync with the runtime Sequelize instance.
const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'mysql',
  database: process.env.DB_NAME || 'inventory',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false
}

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.DB_NAME_TEST || base.database },
  production: { ...base }
}

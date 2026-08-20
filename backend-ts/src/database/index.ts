// const { Sequelize } = require('sequelize')
// const fs = require('fs')
// const path = require('path')
import { Sequelize, DataTypes } from 'sequelize'
import fs from 'node:fs'
import path from 'node:path'
import { IDatabase } from '#/types/database'
const basename = path.basename(__filename)

const dbName = 'inventory'

const folderPath = path.join(process.cwd(), 'src', 'database', 'models')

const sequelize = new Sequelize(dbName, 'root', 'mysql', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    charset: 'utf8',
    collate: 'utf8_general_ci',
    timestamps: true
  }
})
const database: IDatabase = {
  sync: async () => {
    try {
      await sequelize.sync({ alter: true })
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

    for (let i = 0; i < listModels.length; i++) {
      const file = listModels[i]
      const _model = await import(path.join(folderPath, file))
      const model = _model.default(sequelize, DataTypes)
      database[model.name] = model
    }

    Object.keys(database).forEach((modelName) => {
      if (database[modelName].associate) {
        database[modelName].associate(database)
      }
    })
    console.log('Table schema loaded successfully')
  } catch (error) {
    console.log('error', error)
  }
}

export default database

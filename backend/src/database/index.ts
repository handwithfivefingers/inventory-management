// const { Sequelize } = require('sequelize')
// const fs = require('fs')
// const path = require('path')
import { Sequelize, DataTypes } from 'sequelize'
import fs from 'node:fs'
import path from 'node:path'
import { IDatabase } from '@src/types/database'
const basename = path.basename(__filename)
const database: IDatabase = {}
const dbName = 'inventory'
const folderPath = path.join(process.cwd(), 'src', 'database', 'models')

const sequelize = new Sequelize('inventory', 'root', 'mysql', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    charset: 'utf8',
    collate: 'utf8_general_ci',
    timestamps: true
  }
})

fs.readdirSync(folderPath)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  })
  .forEach((file) => {
    const model = require(path.join(folderPath, file))(sequelize, DataTypes)
    database[model.name] = model
  })

Object.keys(database).forEach((modelName) => {
  if (database[modelName].associate) {
    database[modelName].associate(database)
  }
})

database.sequelize = sequelize

database.connect = async () => {
  try {
    await sequelize.authenticate()
    console.log('database Connection has been established successfully')
    return true
  } catch (error) {
    console.log('Unable to connect to the database', error)
    return false
  }
}

database.sync = async () => {
  try {
    await sequelize.sync({ alter: true })
    console.log('database Connection has been established successfully')
    return true
  } catch (error) {
    console.log('Unable to connect to the database', error)
    return false
  }
}

export default database

import { Association, Model, Sequelize } from 'sequelize'

export interface IDatabaseModel extends Model, Association {}

export interface IDatabase {
  sequelize: Sequelize
  connect: () => Promise<boolean>
  sync: () => Promise<boolean>
  [key: string]: any
  load: () => Promise<void>
}

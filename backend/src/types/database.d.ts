import { Sequelize } from 'sequelize'

export interface IDatabase {
  sequelize?: Sequelize
  connect?: () => Promise<boolean>
  sync?: () => Promise<boolean>
}

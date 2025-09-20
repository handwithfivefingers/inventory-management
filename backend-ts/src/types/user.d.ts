// import { Optional, Sequelize } from 'sequelize'

// // export interface UserInstance extends Sequelize.Instance<IUserAttributes>, IUserAttributes {}
// export interface UserAttributes {
//   id: number
//   nickname: string
//   firstName: string
//   lastName: string
//   email: string
//   password: string
//   subscription: string
//   secret: string
// }

// export interface UserModelInstanceMethods extends Sequelize.Model<UserInstance, UserAttributes> {
//   //   verifyPassword: (password: string) => Promise<boolean>
//   //   prototype: {
//   //     verifyPassword: (password: string) => Promise<boolean>
//   //   }
// }

// /**
//  * id: optional
//  */
// export interface UserCreationAttributes extends Optional<UserAttributes, 'id', 'nickname', 'firstName', 'lastName'> {}
import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
import { RoleModel } from './role'
export interface IUserModel extends Model<InferAttributes<IUserModel>, InferCreationAttributes<IUserModel>> {
  id: CreationOptional<number>
  nickname: string
  firstName: string
  lastName: string
  email: string
  password: string
  subscription: string
  secret: string
  createdAt?: CreationOptional<Date>
  updatedAt?: CreationOptional<Date>
  parsed?: Partial<IUserModel>

  createVendor: (...arg: any) => Promise<void>
  createRole: (...arg: any) => Promise<RoleModel>
}

export type IUserStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IUserModel
}

import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions,
  ForeignKey
} from 'sequelize'
import { IUserModel } from './user'
export interface IVendorModel extends Model<InferAttributes<IVendorModel>, InferCreationAttributes<IVendorModel>> {
  id: CreationOptional<number>
  name: string
  userId: ForeignKey<IUserModel['id']>
}

export type IVendorStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IVendorModel
  userId: ForeignKey<number>
}

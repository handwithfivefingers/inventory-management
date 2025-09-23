import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
import { IVendorModel } from './vendor'
export interface IUnitModel extends Model<InferAttributes<IUnitModel>, InferCreationAttributes<IUnitModel>> {
  id: CreationOptional<number>
  name: string
  vendorId: ForeignKey<IVendorModel['id']>
}

export type IUnitStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IUnitModel
}

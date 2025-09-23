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
import { IVendorModel } from './vendor'
export interface ITagModel extends Model<InferAttributes<ITagModel>, InferCreationAttributes<ITagModel>> {
  id: CreationOptional<number>
  name: string
  vendorId: ForeignKey<IVendorModel['id']>
}

export type ITagStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ITagModel
}

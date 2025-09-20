import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface IProviderModel
  extends Model<InferAttributes<IProviderModel>, InferCreationAttributes<IProviderModel>> {
  id: CreationOptional<number>
  name: string
  description: string
  phone: string
  address: string
  email: string
}

export type IProviderStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProviderModel
}

import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface ISettingModel extends Model<InferAttributes<ISettingModel>, InferCreationAttributes<ISettingModel>> {
  id: CreationOptional<number>
  payment: string
}

export type ISettingStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ISettingModel
}

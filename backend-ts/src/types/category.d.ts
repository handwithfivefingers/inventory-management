import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface ICategoryModel extends Model<InferAttributes<ICategoryModel>, InferCreationAttributes<ICategoryModel>> {
  id: CreationOptional<number>
  name: string
}

export type ICategoryStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ICategoryModel
}

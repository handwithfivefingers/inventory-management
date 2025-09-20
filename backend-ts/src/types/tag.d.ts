import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface ITagModel extends Model<InferAttributes<ITagModel>, InferCreationAttributes<ITagModel>> {
  id: CreationOptional<number>
  name: string
}

export type ITagStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ITagModel
}

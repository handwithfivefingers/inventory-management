import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface IUnitModel extends Model<InferAttributes<IUnitModel>, InferCreationAttributes<IUnitModel>> {
  id: CreationOptional<number>
  name: string

}

export type IUnitStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IUnitModel
}

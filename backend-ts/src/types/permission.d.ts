import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface PermissionModel
  extends Model<InferAttributes<PermissionModel>, InferCreationAttributes<PermissionModel>> {
  id: CreationOptional<number>
  name: string
  description: string
  C: boolean
  R: boolean
  U: boolean
  D: boolean
}

export type IPermissionStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): PermissionModel
}

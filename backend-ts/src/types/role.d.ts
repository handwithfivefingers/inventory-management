import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
import { PermissionModel } from './permission'
export interface RoleModel extends Model<InferAttributes<RoleModel>, InferCreationAttributes<RoleModel>> {
  id: CreationOptional<number>
  name: string
  description?: string

  createPermission: (...arg: any) => Promise<PermissionModel>
}

export type RoleStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): RoleModel
}

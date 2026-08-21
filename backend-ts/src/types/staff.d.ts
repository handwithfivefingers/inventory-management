import {
  Sequelize,
  Model,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions,
  ForeignKey
} from 'sequelize'

export interface IStaffModel
  extends Model<InferAttributes<IStaffModel>, InferCreationAttributes<IStaffModel>> {
  id: CreationOptional<number>
  code: string
  fullName: string
  gender?: 'male' | 'female' | 'other' | null
  phone?: string | null
  email?: string | null
  position: string
  salary?: number | null
  hireDate?: Date | null
  status: 'active' | 'inactive'
  address?: string | null
  userId?: ForeignKey<number> | null
  warehouseId?: ForeignKey<number> | null
}

export type IStaffStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IStaffModel
}

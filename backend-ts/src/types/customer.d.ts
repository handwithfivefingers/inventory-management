import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'

export interface ICustomerModel
  extends Model<InferAttributes<ICustomerModel>, InferCreationAttributes<ICustomerModel>> {
  id: CreationOptional<number>
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  taxCode?: string | null
  vendorId?: number | null
}

export type ICustomerStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ICustomerModel
}

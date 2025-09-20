import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface IWarehouseModel
  extends Model<InferAttributes<IWarehouseModel>, InferCreationAttributes<IWarehouseModel>> {
  id: CreationOptional<number>
  name: string
  phone: string
  address: string
  email: string
  isMain: boolean
  vendorId: ForeignKey<number>
}

export type IWarehouseStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IWarehouseModel
  vendorId: ForeignKey<number>
}

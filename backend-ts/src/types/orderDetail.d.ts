import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions,
  ForeignKey
} from 'sequelize'
export interface IOrderDetailModel
  extends Model<InferAttributes<IOrderDetailModel>, InferCreationAttributes<IOrderDetailModel>> {
  id: CreationOptional<number>
  quantity: number
  price: number
  buyPrice: number
  note: string
  warehouseId: ForeignKey<number>
  orderId: ForeignKey<number>
}

export type IOrderDetailStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IOrderDetailModel
}

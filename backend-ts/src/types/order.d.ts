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
export interface IOrderModel extends Model<InferAttributes<IOrderModel>, InferCreationAttributes<IOrderModel>> {
  id: CreationOptional<number>
  VAT: number
  paid: number
  surcharge: number
  price: number
  paymentType: string
  providerId: ForeignKey<number>
  warehouseId: ForeignKey<number>
}

export type IOrderStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IOrderModel
}

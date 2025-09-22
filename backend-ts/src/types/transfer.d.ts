import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface ITransferModel
  extends Model<InferAttributes<ITransferModel>, InferCreationAttributes<ITransferModel>> {
  id: CreationOptional<number>
  quantity: number
  type: string
  warehouseId: ForeignKey<number>
  productId: ForeignKey<number>
  createdAt: CreationOptional<Date>
  updatedAt: CreationOptional<Date>
}

export type ITransferStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ITransferModel
}

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
export interface IInventoryModel extends Model<InferAttributes<IInventoryModel>, InferCreationAttributes<IInventoryModel>> {
  id: CreationOptional<number>
  quantity: number
  productId: ForeignKey<number>
  /** Nullable: NULL = simple-product stock, otherwise stock of one variant */
  variantId?: ForeignKey<number> | null
  warehouseId: ForeignKey<number>
}

export type IInventoryStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IInventoryModel
}

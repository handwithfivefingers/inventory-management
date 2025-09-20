import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'
export interface IProductModel
  extends Model<InferAttributes<IProductModel>, InferCreationAttributes<IProductModel>> {
  id: CreationOptional<number>
  name: string
  code: string
  skuCode: string
  description: string
  salePrice: number
  regularPrice: number
  wholeSalePrice: number
  costPrice: number
  sold: number
}

export type IProductStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProductModel
}

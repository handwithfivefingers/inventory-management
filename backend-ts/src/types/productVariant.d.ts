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

export interface IProductVariantModel
  extends Model<InferAttributes<IProductVariantModel>, InferCreationAttributes<IProductVariantModel>> {
  id: CreationOptional<number>
  productId: ForeignKey<number>
  code: string | null
  skuCode: string
  salePrice: number | null
  regularPrice: number | null
  wholeSalePrice: number | null
  costPrice: number | null
  sold: CreationOptional<number>
  isActive: CreationOptional<boolean>
  isNegative: CreationOptional<boolean>

  setAttributeValues(values: number[], options?: any): Promise<void>
}

export type IProductVariantStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProductVariantModel
}

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
export interface IProductCategoryModel
  extends Model<InferAttributes<IProductCategoryModel>, InferCreationAttributes<IProductCategoryModel>> {
  categoryId: ForeignKey<number>
  productId: ForeignKey<number>
  // createdAt: CreationOptional<Date>
  // updatedAt: CreationOptional<Date>
}

export type IProductCategoryStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProductCategoryModel
}

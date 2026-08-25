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

export interface IProductAttributeModel
  extends Model<
    InferAttributes<IProductAttributeModel>,
    InferCreationAttributes<IProductAttributeModel>
  > {
  id: CreationOptional<number>
  name: string
  productId: ForeignKey<number>
}

export type IProductAttributeStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProductAttributeModel
}

export interface IProductAttributeValueModel
  extends Model<
    InferAttributes<IProductAttributeValueModel>,
    InferCreationAttributes<IProductAttributeValueModel>
  > {
  id: CreationOptional<number>
  value: string
  attributeId: ForeignKey<number>
  productId: ForeignKey<number>
}

export type IProductAttributeValueStatic = typeof Model & {
  associate: (models: any) => void
} & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IProductAttributeValueModel
}

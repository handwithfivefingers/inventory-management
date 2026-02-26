import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'

export interface IInvoiceDetailModel
  extends Model<InferAttributes<IInvoiceDetailModel>, InferCreationAttributes<IInvoiceDetailModel>> {
  id: CreationOptional<number>
  invoiceId: number
  productId?: number | null
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  taxAmount: number
  subtotal: number
}

export type IInvoiceDetailStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IInvoiceDetailModel
}

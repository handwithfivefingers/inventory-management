import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled'
export type PaymentType = 'cash' | 'transfer' | 'credit'

export interface IInvoiceModel
  extends Model<InferAttributes<IInvoiceModel>, InferCreationAttributes<IInvoiceModel>> {
  id: CreationOptional<number>
  invoiceNumber: string
  orderId?: number | null
  customerId?: number | null
  vendorId?: number | null
  warehouseId?: number | null
  subtotal: number
  discount: number
  VAT?: number | null
  taxAmount: number
  surcharge: number
  total: number
  paid: number
  remaining: number
  currency: string
  paymentType: PaymentType
  status: InvoiceStatus
  dueDate?: Date | null
  notes?: string | null
}

export type IInvoiceStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IInvoiceModel
}

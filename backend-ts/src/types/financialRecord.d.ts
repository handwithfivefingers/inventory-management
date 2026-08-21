import {
  Sequelize,
  Model,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions,
  ForeignKey
} from 'sequelize'

export interface IFinancialRecordModel
  extends Model<InferAttributes<IFinancialRecordModel>, InferCreationAttributes<IFinancialRecordModel>> {
  id: CreationOptional<number>
  code: string
  type: 'revenue' | 'expense'
  category: string
  amount: number
  note?: string | null
  relatedType?: string | null
  relatedId?: number | null
  staffId?: ForeignKey<number> | null
  warehouseId?: ForeignKey<number> | null
  transactionDate: Date
}

export type IFinancialRecordStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IFinancialRecordModel
}

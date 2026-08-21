import {
  Sequelize,
  Model,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions,
  ForeignKey
} from 'sequelize'

export interface IShiftModel
  extends Model<InferAttributes<IShiftModel>, InferCreationAttributes<IShiftModel>> {
  id: CreationOptional<number>
  code: string
  staffId?: ForeignKey<number> | null
  openTime: Date
  closeTime?: Date | null
  openingCash: number
  closingCash?: number | null
  expectedCash?: number | null
  actualCash?: number | null
  difference?: number | null
  status: 'open' | 'closed'
  note?: string | null
  warehouseId?: ForeignKey<number> | null
}

export type IShiftStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IShiftModel
}

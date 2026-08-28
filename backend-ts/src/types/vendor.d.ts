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
import { IUserModel } from './user'
export interface IVendorModel extends Model<InferAttributes<IVendorModel>, InferCreationAttributes<IVendorModel>> {
  id: CreationOptional<number>
  name: string
  userId: ForeignKey<IUserModel['id']>

  getUser: () => void
  setUser: () => void
  createUser: () => void
  getVendors: () => void
  countVendors: () => void
  hasVendor: () => void
  hasVendors: () => void
  setVendors: () => void
  addVendor: () => void
  addVendors: () => void
  removeVendor: () => void
  removeVendors: () => void
  createVendor: () => void
  getRole: () => void
  setRole: () => void
  createRole: () => void
  getShifts: () => void
  countShifts: () => void
  hasShift: () => void
  hasShifts: () => void
  setShifts: () => void
  addShift: () => void
  addShifts: () => void
  removeShift: () => void
  removeShifts: () => void
  createShift: () => void
  getFinancialRecords: () => void
  countFinancialRecords: () => void
  hasFinancialRecord: () => void
  hasFinancialRecords: () => void
  setFinancialRecords: () => void
  addFinancialRecord: () => void
  addFinancialRecords: () => void
  removeFinancialRecord: () => void
  removeFinancialRecords: () => void
  createFinancialRecord: () => void
}

export type IVendorStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): IVendorModel
  userId: ForeignKey<number>
}

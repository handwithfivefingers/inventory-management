import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Vendor } from './vendor'

const DEFAULT_CODE_PREFIX = { order: '', customer: '', product: '', category: '' }
const DEFAULT_SHIP_DELIVERY = { enabled: false, fee: 0 }

const jsonField = (field: string, fallback: any = {}) => ({
  get(this: any) {
    const val = this.getDataValue(field)
    if (!val) return { ...fallback }
    try {
      const parsed = JSON.parse(val)
      return parsed || { ...fallback }
    } catch {
      return { ...fallback }
    }
  },
  set(this: any, value: any) {
    this.setDataValue(field, JSON.stringify(value ?? fallback))
  }
})

@Table({ tableName: 'settings', modelName: 'setting', timestamps: true })
export class Setting extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @Column({ type: DataType.STRING, ...jsonField('payment', {}) })
  declare payment: Record<string, any>

  @Column({ type: DataType.STRING(10), defaultValue: 'vi' })
  declare language: string

  @Column({ type: DataType.STRING(20), defaultValue: 'system' })
  declare theme: string

  @Column({ type: DataType.STRING(10), defaultValue: 'VND' })
  declare moneyUnit: string

  @Column({ type: DataType.STRING(10), defaultValue: 'suffix' })
  declare moneyUnitPosition: string

  @Column({ type: DataType.STRING, defaultValue: '{CODE}' })
  declare skuTemplate: string

  @Column({ type: DataType.TEXT, ...jsonField('codePrefix', DEFAULT_CODE_PREFIX) })
  declare codePrefix: any

  @Column({ type: DataType.TEXT, ...jsonField('codeSuffix', DEFAULT_CODE_PREFIX) })
  declare codeSuffix: any

  @Column({ type: DataType.TEXT, ...jsonField('shipDelivery', DEFAULT_SHIP_DELIVERY) })
  declare shipDelivery: any

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare defaultTaxRate: number

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare defaultDiscount: number

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare defaultSurcharge: number

  @Column({ type: DataType.BIGINT, defaultValue: 1000 })
  declare moneyStep: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor)
  declare vendor: Vendor
}

export default Setting

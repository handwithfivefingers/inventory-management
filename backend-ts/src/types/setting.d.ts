import {
  Sequelize,
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BuildOptions
} from 'sequelize'

export type ICodeEntity = 'order' | 'customer' | 'product' | 'category'

/** Map of entity -> prefix string (for settings.codePrefix) or suffix string (settings.codeSuffix) */
export type ICodeFormatMap = Partial<Record<ICodeEntity, string>>

export interface IShipDeliveryConfig {
  enabled?: boolean
  fee?: number
  freeThreshold?: number | null
  note?: string | null
}

export interface ISettingModel
  extends Model<InferAttributes<ISettingModel>, InferCreationAttributes<ISettingModel>> {
  id: CreationOptional<number>
  vendorId?: number | null
  payment: Record<string, any>
  language?: string | null
  theme?: string | null
  moneyUnit?: string | null
  moneyUnitPosition?: 'prefix' | 'suffix' | null
  moneyStep?: number | null
  skuTemplate?: string | null
  codePrefix?: ICodeFormatMap
  codeSuffix?: ICodeFormatMap
  shipDelivery?: IShipDeliveryConfig
  defaultTaxRate?: number | null
  defaultDiscount?: number | null
  defaultSurcharge?: number | null
}

export type ISettingStatic = typeof Model & { associate: (models: any) => void } & {
  new (values?: Record<string, unknown>, options?: BuildOptions): ISettingModel
}

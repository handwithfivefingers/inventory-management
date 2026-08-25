import { ISettingModel, ISettingStatic } from '#/types/setting'
import { Sequelize, DataTypes } from 'sequelize'

/**
 * Parse a TEXT column that stores JSON, falling back to a default value.
 */
const jsonField = (field: string, fallback: any = {}) => ({
  set(this: any, value: any) {
    this.setDataValue(field, JSON.stringify(value ?? fallback))
  },
  get(this: any) {
    const val = this.getDataValue(field)
    if (!val) return { ...fallback }
    try {
      const parsed = JSON.parse(val)
      return parsed || { ...fallback }
    } catch (e) {
      return { ...fallback }
    }
  }
})

const DEFAULT_CODE_PREFIX = { order: '', customer: '', product: '', category: '' }
const DEFAULT_SHIP_DELIVERY = { enabled: false, fee: 0 }

const Setting = (sequelize: Sequelize) => {
  const Model = <ISettingStatic>sequelize.define<ISettingModel>(
    'setting',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      payment: {
        type: DataTypes.STRING,
        ...jsonField('payment', {})
      },
      // General
      language: {
        type: DataTypes.STRING(10),
        defaultValue: 'vi'
      },
      theme: {
        type: DataTypes.STRING(20),
        defaultValue: 'system'
      },
      // Money unit + position (prefix/suffix when displaying amounts)
      moneyUnit: {
        type: DataTypes.STRING(10),
        defaultValue: 'VND'
      },
      moneyUnitPosition: {
        type: DataTypes.STRING(10),
        defaultValue: 'suffix'
      },
      // SKU template, tokens: {CODE} {SEQ} {CATEGORY} {YYYY}
      skuTemplate: {
        type: DataTypes.STRING,
        defaultValue: '{CODE}'
      },
      // Prefix/suffix applied per entity: order/customer/product/category
      codePrefix: {
        type: DataTypes.TEXT,
        ...jsonField('codePrefix', DEFAULT_CODE_PREFIX)
      },
      codeSuffix: {
        type: DataTypes.TEXT,
        ...jsonField('codeSuffix', DEFAULT_CODE_PREFIX)
      },
      // Ship / delivery configuration
      shipDelivery: {
        type: DataTypes.TEXT,
        ...jsonField('shipDelivery', DEFAULT_SHIP_DELIVERY)
      },
      // Tax config (existing columns kept for compatibility)
      defaultTaxRate: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      defaultDiscount: {
        type: DataTypes.BIGINT,
        defaultValue: 0
      },
      defaultSurcharge: {
        type: DataTypes.BIGINT,
        defaultValue: 0
      },
      // Step size for money +/- steppers (e.g. 1000 for VND pricing)
      moneyStep: {
        type: DataTypes.BIGINT,
        defaultValue: 1000
      }
    },
    {
      timestamps: true,
      tableName: 'settings'
    }
  )
  Model.associate = (models) => {
    Model.belongsTo(models.vendor, { foreignKey: 'vendorId' })
  }
  return Model
}

export default Setting

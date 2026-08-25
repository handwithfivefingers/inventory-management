import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ISettingModel } from '#/types/setting'
import { Sequelize } from 'sequelize'

const DEFAULT_CODE_FORMAT = { order: '', customer: '', product: '', category: '' }
const DEFAULT_SHIP_DELIVERY = { enabled: false, fee: 0 }

/**
 * Fields on the settings row that can be written through the API.
 */
const EDITABLE_FIELDS = [
  'language',
  'theme',
  'moneyUnit',
  'moneyUnitPosition',
  'moneyStep',
  'skuTemplate',
  'defaultTaxRate',
  'defaultDiscount',
  'defaultSurcharge'
] as const

export class SettingService {
  setting = database.setting
  sequelize: Sequelize = database.sequelize

  /**
   * Resolve the vendorId for a request: explicit param wins, then req.user.
   */
  resolveVendorId(req: IRequestLocal, vendorId?: number | string | null) {
    const finalVendorId = vendorId || (req as any)?.user?.vendorId
    if (!finalVendorId) {
      throw new Error('vendorId is required')
    }
    return Number(finalVendorId)
  }

  /**
   * Find the settings row for a vendor, creating defaults on first access.
   */
  async getForVendor(vendorId?: number | string | null): Promise<ISettingModel> {
    if (!vendorId) throw new Error('vendorId is required')
    const id = Number(vendorId)
    let settings = await this.setting.findOne({ where: { vendorId: id } })
    if (!settings) {
      settings = await this.setting.create({
        vendorId: id,
        codePrefix: DEFAULT_CODE_FORMAT,
        codeSuffix: DEFAULT_CODE_FORMAT,
        shipDelivery: DEFAULT_SHIP_DELIVERY
      } as any)
    }
    return settings
  }

  async get(req: IRequestLocal) {
    const vendorId =
      (req.query?.vendorId as string | undefined) ?? (req as any)?.user?.vendorId
    if (!vendorId && (req as any)?.locals?.id) {
      // No explicit vendor on the request: fall back to the user's first vendor
      const vendor = await database.vendor.findOne({
        where: { userId: Number((req as any).locals.id) }
      })
      if (vendor) return this.getForVendor(vendor.id)
    }
    return this.getForVendor(vendorId)
  }

  async update(
    req: IRequestLocal,
    payload: Record<string, any> & { vendorId?: number | string }
  ) {
    const t = await this.sequelize.transaction()
    try {
      const { vendorId, ...data } = payload || {}
      const finalVendorId = this.resolveVendorId(req, vendorId)
      const settings = await this.getForVendor(finalVendorId)

      const updateParams: Record<string, any> = {}
      for (const field of EDITABLE_FIELDS) {
        if (data[field] !== undefined) updateParams[field] = data[field]
      }
      if (data.codePrefix !== undefined) updateParams.codePrefix = data.codePrefix
      if (data.codeSuffix !== undefined) updateParams.codeSuffix = data.codeSuffix
      if (data.shipDelivery !== undefined) updateParams.shipDelivery = data.shipDelivery
      if (data.payment !== undefined) updateParams.payment = data.payment

      await settings.update(updateParams, { transaction: t })
      await t.commit()
      return settings.reload()
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}

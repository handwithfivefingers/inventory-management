import database from '#/database'
import { IRequestLocal } from '#/types/common'
import { ITransferStatic } from '#/types/transfer'
import { Op, Sequelize } from 'sequelize'

interface ICreateParams {
  fromWarehouseId?: number | null
  toWarehouseId?: number | null
  /** Legacy single warehouse field – automatically mapped to fromWarehouseId for backwards compatibility */
  warehouseId?: number | null
  productId: number
  /** Optional: set for variant-level movements, NULL/undefined = product level */
  variantId?: number | null
  quantity: number
  type?: string | null
  status?: string | null
}
export class TransferService {
  sequelize: Sequelize = database.sequelize
  transfer: ITransferStatic = database.transfer
  async getHistoryByProductId({
    id,
    warehouseId,
    variantId
  }: {
    id: string
    warehouseId: string | string[]
    variantId?: string | number | null
  }) {
    try {
      const warehouseQuery = typeof warehouseId === 'string' ? [warehouseId] : warehouseId
      const where: Record<string, unknown> = {
        productId: id,
        [Op.or]: [
          { fromWarehouseId: { [Op.in]: warehouseQuery } },
          { toWarehouseId: { [Op.in]: warehouseQuery } }
        ]
      }
      // Filter by a specific variant; omit the key entirely to keep the
      // legacy behaviour of returning all movements for the product.
      if (variantId != null && variantId !== '') {
        where.variantId = Number(variantId)
      }
      const resp = await this.transfer.findAndCountAll({
        where,
        include: [
          {
            model: database.productVariant,
            attributes: ['id', 'skuCode'],
            required: false
          }
        ] as any
      })
      return resp
    } catch (error) {
      throw error
    }
  }

  async create(params: ICreateParams, options?: any) {
    // Backwards compat: map legacy warehouseId -> fromWarehouseId
    const normalized: any = { ...params }
    if (normalized.warehouseId != null && normalized.fromWarehouseId == null) {
      normalized.fromWarehouseId = normalized.warehouseId
    }
    delete normalized.warehouseId
    const transferBuilder = this.transfer.build(normalized)
    const trans = await transferBuilder.save(options)
    return trans
  }
}

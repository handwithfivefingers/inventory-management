import database from '#/database'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductVariant from '#/database/models/productVariant'
import Stocktake from '#/database/models/stocktake'
import StocktakeDetail from '#/database/models/stocktakeDetail'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { getPagination } from '#/utils'
import { assertVendorAccess, assertWarehouseAccess, getRequestedVendorId, getRequestedWarehouseId, getVendorScope } from '#/utils/tenant'
import { Op, Sequelize } from 'sequelize'

/**
 * Stocktake (đồng kiểm kho) workflow:
 *  1. start(warehouseId)      -> open session + snapshot stock
 *  2. updateLines(lines)      -> save physical counts while open
 *  3. complete(id)            -> apply variances as corrective transfers
 *  4. cancel(id)              -> discard without touching stock
 */
export class StocktakeService {
  sequelize: Sequelize = database.sequelize

  private resolveWarehouse = async (req: IRequestLocal, warehouseId: number, t: any) => {
    if (!warehouseId) throw new Error('warehouseId is required')
    const scope = getVendorScope(req)
    const vendorId = await assertWarehouseAccess(warehouseId, scope)
    if (!vendorId) {
      // Platform admin: fall back to the warehouse's own vendor
      const wh: any = await database.warehouse.findByPk(warehouseId, { transaction: t })
      return Number(wh?.vendorId) || null
    }
    return vendorId
  }

  /** Open a new stocktake session and snapshot current stock into details */
  async start(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const body: any = (req as any).body || {}
      const warehouseId = Number(body.warehouseId ?? getRequestedWarehouseId(req))
      const vendorId = await this.resolveWarehouse(req, warehouseId, t)

      // Only one open session per warehouse at a time
      const openSession: any = await Stocktake.findOne({
        where: { warehouseId, status: 'open' },
        transaction: t
      })
      if (openSession) {
        throw new Error(`Warehouse already has an open stocktake session (id ${openSession.get('id')}). Complete or cancel it first.`)
      }

      // Snapshot every stock row of the warehouse (product-level + variants)
      const rows: any[] = await Inventory.findAll({ where: { warehouseId }, transaction: t })
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const count = (await Stocktake.count()) + 1
      const session: any = await Stocktake.build({
        code: `ST-${datePart}-${String(count).padStart(4, '0')}`,
        warehouseId,
        vendorId,
        staffId: (req as any)?.user?.staffId ?? null,
        status: 'open',
        note: body.note ? String(body.note) : null
      }).save({ transaction: t })

      if (rows.length) {
        await StocktakeDetail.bulkCreate(
          rows.map((row: any) => ({
            stocktakeId: session.get('id'),
            productId: Number(row.get('productId')),
            variantId: (row.get('variantId') as number | null) ?? null,
            expectedQuantity: Number(row.get('quantity')) || 0
          })),
          { transaction: t }
        )
      }

      await t.commit()
      return session
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /** Record counted quantities: lines = [{ id, actualQuantity, note? }] */
  async updateLines(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const body: any = (req as any).body || {}
      const stocktakeId = Number((req.params as any).id)
      const lines: any[] = Array.isArray(body.lines) ? body.lines : []
      if (!stocktakeId) throw new Error('stocktake id is required')
      const scope = getVendorScope(req)
      const session: any = await Stocktake.findByPk(stocktakeId, { transaction: t })
      if (!session) throw new Error('Stocktake session not found')
      assertVendorAccess(scope, session.vendorId, 'Unauthorized stocktake session')
      if (session.get('status') !== 'open') throw new Error('Only open sessions can be updated')

      for (const line of lines) {
        const detail: any = await StocktakeDetail.findOne({
          where: { id: Number(line.id), stocktakeId },
          transaction: t
        })
        if (!detail) continue
        await detail.update(
          {
            ...(line.actualQuantity !== undefined && line.actualQuantity !== null && line.actualQuantity !== ''
              ? { actualQuantity: Number(line.actualQuantity) }
              : {}),
            ...(line.note !== undefined ? { note: line.note } : {})
          },
          { transaction: t }
        )
      }

      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /** Complete the session: apply every variance as a corrective transfer */
  async complete(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const stocktakeId = Number((req.params as any).id)
      const scope = getVendorScope(req)
      const session: any = await Stocktake.findByPk(stocktakeId, { transaction: t })
      if (!session) throw new Error('Stocktake session not found')
      assertVendorAccess(scope, session.vendorId, 'Unauthorized stocktake session')
      if (session.get('status') !== 'open') throw new Error('Only open sessions can be completed')
      const warehouseId = Number(session.get('warehouseId'))

      const details: any[] = await StocktakeDetail.findAll({ where: { stocktakeId }, transaction: t })
      let adjusted = 0
      for (const detail of details as any[]) {
        const actualRaw = detail.get('actualQuantity')
        if (actualRaw == null) continue // not counted -> leave untouched
        const expected = Number(detail.get('expectedQuantity'))
        const actual = Number(actualRaw)
        const variance = actual - expected
        if (variance === 0) continue

        const productId = Number(detail.get('productId'))
        const variantId = Number(detail.get('variantId'))
        if (!Number.isFinite(variantId)) throw new Error('variantId is required')
        const where: Record<string, unknown> = {
          productId,
          warehouseId,
          variantId
        }
        const inv: any = await Inventory.findOne({ where, transaction: t })
        if (inv) {
          await inv.update({ quantity: actual }, { transaction: t })
        } else {
          await Inventory.build({ ...where, quantity: actual }).save({ transaction: t })
        }
        // Corrective movement keeps the audit trail (type '0' IN when surplus, '1' OUT when shortage)
        await (database as any).transfer
          .build({
            fromWarehouseId: warehouseId,
            quantity: Math.abs(variance),
            productId,
            variantId,
            type: variance > 0 ? '0' : '1',
            status: `stocktake:${session.get('code')}`
          })
          .save({ transaction: t })
        adjusted += 1
      }

      await session.update({ status: 'completed', completedAt: new Date() }, { transaction: t })
      await t.commit()
      return { adjusted, total: details.length }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /** Cancel an open session without touching stock */
  async cancel(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const stocktakeId = Number((req.params as any).id)
      const scope = getVendorScope(req)
      const session: any = await Stocktake.findByPk(stocktakeId, { transaction: t })
      if (!session) throw new Error('Stocktake session not found')
      assertVendorAccess(scope, session.vendorId, 'Unauthorized stocktake session')
      if (session.get('status') !== 'open') throw new Error('Only open sessions can be cancelled')
      await session.update({ status: 'cancelled' }, { transaction: t })
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, 400)
    }
  }

  async list(req: IRequestLocal) {
    try {
      const scope = getVendorScope(req)
      const { offset, limit } = getPagination(req.query)
      const where: any = {}
      const rawVendorId = getRequestedVendorId(req)
      if (rawVendorId != null && String(rawVendorId).trim() !== '') {
        assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized vendor filter')
        where.vendorId = Number(rawVendorId)
      } else if (scope !== null) {
        where.vendorId = { [Op.in]: scope.length ? scope : [-1] }
      }
      const { rows, count } = await Stocktake.findAndCountAll({
        where,
        include: [{ model: StocktakeDetail as any }],
        offset: Number(offset),
        limit: Number(limit),
        order: [['id', 'DESC']],
        distinct: true
      })
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }

  async getById(req: IRequestLocal) {
    try {
      const scope = getVendorScope(req)
      const id = Number((req.params as any).id)
      const session: any = await Stocktake.findByPk(id, {
        include: [
          {
            model: StocktakeDetail as any,
            include: [
              { model: Product, attributes: ['id', 'name'], paranoid: false },
              { model: ProductVariant, attributes: ['id', 'skuCode'], paranoid: false }
            ]
          }
        ]
      })
      if (!session) throw new Error('Stocktake session not found')
      assertVendorAccess(scope, session.vendorId, 'Unauthorized stocktake session')
      return session
    } catch (error) {
      throw ApiError.from(error, 400)
    }
  }
}

export default StocktakeService

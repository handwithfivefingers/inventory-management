import database from '#/database'
import Inventory from '#/database/models/inventory'
import Product from '#/database/models/product'
import ProductVariant from '#/database/models/productVariant'
import Transfer from '#/database/models/transfer'
import Warehouse from '#/database/models/warehouse'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { IWarehouseModel, IWarehouseStatic } from '#/types/warehouse'
import { getPagination } from '#/utils'
import { evictCachedEntity, getCachedEntity, setCachedEntity } from '#/utils/entity-cache'
import { assertVendorAccess, getVendorScope } from '#/utils/tenant'
import { FindAttributeOptions, Op, Optional, Sequelize, Transaction } from 'sequelize'

// const BaseCRUDService = require('@constant/base')
// const redisClient = require('@src/config/redis')
// const { cacheGet, cacheKey, cacheSet } = require('@src/libs/redis')
// const { retrieveUser } = require('@src/libs/utils')

export class WarehouseService {
  warehouse: IWarehouseStatic = database.warehouse
  sequelize: Sequelize = database.sequelize
  async create({ name, isMain, email, address, phone, vendorId }: Optional<IWarehouseModel, 'id'>) {
    const t = await this.sequelize.transaction()
    try {
      if (isMain === true && vendorId) {
        await this.warehouse.update({ isMain: false }, { where: { vendorId, isMain: true }, transaction: t })
      }
      const builder = this.warehouse.build({
        name,
        isMain: !!isMain,
        email,
        address,
        phone,
        vendorId
      })
      const p = await builder.save({ transaction: t })

      await t.commit()
      // Cache-Aside: prime `warehouse:<id>` after a successful DB write.
      await setCachedEntity('warehouse', (p as any)?.id ?? (p as any)?.get?.('id'), p)
      return {
        warehouse: p
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
  async getWarehouse({ offset, limit, vendorId }: { offset?: number; limit?: number; vendorId?: string }) {
    try {
      const queryParams = {
        where: {},
        attributes: {
          include: [
            [
              this.sequelize.literal(`
                (SELECT SUM(quantity) 
                FROM inventories
                WHERE inventories.warehouseId = warehouse.id)`),
              'quantity'
            ]
          ]
        } as FindAttributeOptions,
        offset,
        limit,
        distinct: true,
        logger: console.log
      }
      if (vendorId) queryParams.where = { ...queryParams.where, vendorId: vendorId }
      const { rows, count } = await Warehouse.findAndCountAll(queryParams)
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error)
    }
  }
  async getWarehouseById({ id, vendorId }: Partial<IWarehouseModel>) {
    try {
      // Cache-Aside on `warehouse:<id>`: Hit returns immediately, Miss loads
      // from DB then populates Redis. The cached row still carries `vendorId`
      // so the tenant filter below is re-checked on a Hit (no cross-vendor leak).
      const resp: any = await getCachedEntity('warehouse', Number(id), () =>
        this.warehouse.findOne({
          where: {
            id,
            vendorId
          },
          include: { model: database.inventory, attributes: [] },
          attributes: {
            include: [[this.sequelize.col('inventories.quantity'), 'quantity']]
          }
        })
      )
      if (resp && vendorId != null && String(vendorId).trim() !== '') {
        const rowVendorId = Number(resp?.vendorId ?? resp?.get?.('vendorId'))
        if (Number.isFinite(rowVendorId) && rowVendorId !== Number(vendorId)) return null
      }
      return resp
    } catch (error) {
      throw error
    }
  }

  async update({
    id,
    vendorId,
    name,
    email,
    address,
    phone,
    isMain
  }: Partial<IWarehouseModel> & { id: number | string }) {
    const t = await this.sequelize.transaction()
    try {
      const warehouse = await this.warehouse.findOne({
        where: { id, vendorId },
        transaction: t
      })
      if (!warehouse) throw ApiError.from({ message: 'Warehouse not found', status: 404 } as any)

      // Enforce single main warehouse per vendor
      if (isMain === true) {
        await this.warehouse.update({ isMain: false }, { where: { vendorId, isMain: true }, transaction: t })
      }

      const updatable: Partial<IWarehouseModel> = {}
      if (name !== undefined) (updatable as any).name = name
      if (email !== undefined) (updatable as any).email = email
      if (address !== undefined) (updatable as any).address = address
      if (phone !== undefined) (updatable as any).phone = phone
      if (isMain !== undefined) (updatable as any).isMain = isMain

      await warehouse.update(updatable, { transaction: t })
      await t.commit()
      // DB succeeded first -> evict `warehouse:<id>` to avoid stale reads.
      await evictCachedEntity('warehouse', Number(id))
      return warehouse
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error)
    }
  }

  /**
   * Stock transfer between two warehouses of the same vendor.
   * Items: [{ productId, variantId?, quantity }].
   * Decrements stock at the source, increments at the destination, and
   * records ONE transfer row per item with fromWarehouseId + toWarehouseId
   * (type '1' = OUT of source) so the movement history stays auditable.
   */
  async transferStock(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const body: any = (req as any).body || {}
      const fromWarehouseId = Number(body.fromWarehouseId)
      const toWarehouseId = Number(body.toWarehouseId)
      const items: any[] = Array.isArray(body.items) ? body.items : []
      const note = body.note ? String(body.note) : null

      if (!fromWarehouseId || !toWarehouseId) throw new Error('fromWarehouseId and toWarehouseId are required')
      if (fromWarehouseId === toWarehouseId) throw new Error('Source and destination warehouses must differ')
      if (!items.length) throw new Error('items are required')

      const scope = getVendorScope(req)
      const fromWh: any = await Warehouse.findByPk(fromWarehouseId, { transaction: t })
      const toWh: any = await Warehouse.findByPk(toWarehouseId, { transaction: t })
      if (!fromWh) throw new Error(`Warehouse ${fromWarehouseId} not found`)
      if (!toWh) throw new Error(`Warehouse ${toWarehouseId} not found`)
      // Both endpoints must belong to the caller's vendor scope; a cross-vendor
      // move would silently break the tenant's stock accounting.
      assertVendorAccess(scope, fromWh.vendorId, 'Unauthorized source warehouse')
      assertVendorAccess(scope, toWh.vendorId, 'Unauthorized destination warehouse')
      if (Number(fromWh.vendorId) !== Number(toWh.vendorId)) {
        throw new Error('Cannot transfer stock between warehouses of different vendors')
      }
      const vendorId = Number(fromWh.vendorId)

      const results: any[] = []
      for (const item of items) {
        const productId = Number(item.productId)
        const variantId = item.variantId != null && item.variantId !== '' ? Number(item.variantId) : null
        const quantity = Number(item.quantity)
        if (!productId || !quantity || quantity <= 0) {
          throw new Error(`Invalid item: productId and positive quantity are required`)
        }
        if (variantId == null || !Number.isFinite(variantId)) throw new Error('variantId is required')

        // Product ownership check (also gives a nicer error than an FK failure)
        const product: any = await Product.findByPk(productId, { transaction: t })
        if (!product) {
          const deleted = await Product.findByPk(productId, { paranoid: false, transaction: t } as any)
          if (deleted) throw new Error(`Product ${productId} is deleted/discontinued and cannot be transferred`)
          throw new Error(`Product ${productId} not found`)
        }
        assertVendorAccess(scope, product.vendorId, 'Unauthorized product')
        if (variantId != null) {
          const variant: any = await ProductVariant.findByPk(variantId, { transaction: t })
          if (!variant || Number(variant.productId) !== productId) {
            const deletedVariant = await ProductVariant.findByPk(variantId, {
              paranoid: false,
              transaction: t
            } as any)
            if (deletedVariant) throw new Error(`Variant ${variantId} is deleted/discontinued`)
            throw new Error(`Variant ${variantId} does not belong to product ${productId}`)
          }
        }

        await this.moveStock({
          productId,
          variantId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          note,
          transaction: t
        })
        results.push({ productId, variantId, quantity })
      }

      await t.commit()
      return { transferred: results }
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, 400)
    }
  }

  /**
   * Move one item's stock between warehouses inside a transaction:
   * source row decrements (fails when insufficient), destination row
   * upserts, and a single auditable Transfer row links both endpoints.
   */
  private async moveStock({
    productId,
    variantId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    note,
    transaction: t
  }: {
    productId: number
    variantId: number
    fromWarehouseId: number
    toWarehouseId: number
    quantity: number
    note: string | null
    transaction: Transaction
  }) {
    const sourceWhere: Record<string, unknown> = {
      productId,
      warehouseId: fromWarehouseId,
      variantId
    }
    // Atomic decrement guarded by quantity >= requested: two concurrent
    // transfers can't both take the same stock (C2 pattern from OrderService).
    const affected = await Inventory.decrement('quantity', {
      by: quantity,
      where: { ...sourceWhere, quantity: { [Op.gte]: quantity } } as any,
      transaction: t
    })
    const affectedCount = this.countAffected(affected)
    if (affectedCount === 0) {
      const row = await Inventory.findOne({ where: sourceWhere, transaction: t })
      if (!row) throw new Error('Stock row not found in source warehouse')
      const label = `variant ${variantId} of product ${productId}`
      throw new Error(`Insufficient stock in source warehouse for ${label}`)
    }

    const destWhere: Record<string, unknown> = {
      productId,
      warehouseId: toWarehouseId,
      variantId
    }
    const dest: any = await Inventory.findOne({ where: destWhere, transaction: t })
    if (dest) {
      await dest.increment('quantity', { by: quantity, transaction: t })
    } else {
      await Inventory.build({
        productId,
        variantId,
        warehouseId: toWarehouseId,
        quantity
      }).save({ transaction: t })
    }

    await Transfer.build({
      productId,
      variantId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      type: '1',
      status: note ? `note:${note}` : null
    }).save({ transaction: t })
  }

  /** Normalize sequelize increment/decrement result shapes to a row count */
  private countAffected(raw: any): number {
    if (Array.isArray(raw)) {
      if (Array.isArray(raw[0])) return (raw[0] as any)[1] ?? (raw[0] as any)[0] ?? 0
      if (typeof raw[1] === 'number') return raw[1]
      if (typeof raw[0] === 'number') return raw[0]
    }
    return typeof raw === 'number' ? raw : raw ? 1 : 0
  }
}

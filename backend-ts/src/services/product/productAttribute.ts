import database from '#/database'
import Product from '#/database/models/product'
import ProductAttribute from '#/database/models/productAttribute'
import ProductAttributeValue from '#/database/models/productAttributeValue'
import ProductVariant from '#/database/models/productVariant'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { assertVendorAccess, getVendorScope } from '#/utils/tenant'
import { getPagination } from '#/utils'
import { Op, Sequelize } from 'sequelize'

export class ProductAttributeServices {
  sequelize: Sequelize = database.sequelize

  private resolveVendorId(req: IRequestLocal): number {
    const raw = (req.query as any)?.vendorId ?? (req.body as any)?.vendorId
    if (raw != null && String(raw).trim() !== '') return Number(raw)
    const scope = getVendorScope(req)
    if (scope && scope.length > 0) return scope[0]
    const fallback = (req as any)?.user?.vendorId
    if (fallback) return Number(fallback)
    throw new Error('vendorId is required')
  }

  async listAttributes(req: IRequestLocal) {
    try {
      const scope = getVendorScope(req)
      const rawVendorId = (req.query as any)?.vendorId
      let where: any = {}
      if (rawVendorId != null && String(rawVendorId).trim() !== '') {
        assertVendorAccess(scope, Number(rawVendorId), 'Unauthorized to list attributes for this vendor')
        where.vendorId = Number(rawVendorId)
      } else if (scope !== null) {
        if (scope.length === 0) return { rows: [], count: 0 }
        where.vendorId = { [Op.in]: scope }
      }
      const { limit, offset } = getPagination(req.query as any)
      const { rows, count } = await ProductAttribute.findAndCountAll({
        where,
        include: [{ model: ProductAttributeValue, as: 'values' }],
        order: [['id', 'ASC']],
        limit,
        offset,
        distinct: true
      })
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  // Keep simple getAttributes used by old call sites (returns array)
  async getAttributes({ vendorId }: { vendorId?: string | number }) {
    const where: any = {}
    if (vendorId != null && String(vendorId).trim() !== '') where.vendorId = Number(vendorId)
    return ProductAttribute.findAll({
      where,
      include: [{ model: ProductAttributeValue, as: 'values' }],
      order: [['id', 'ASC']]
    })
  }

  async getAttributeById(req: IRequestLocal) {
    try {
      const id = Number((req.params as any).attributeId ?? (req.params as any).id)
      if (!id) throw new Error('attribute id is required')
      const scope = getVendorScope(req)
      const attr = await ProductAttribute.findByPk(id, {
        include: [{ model: ProductAttributeValue, as: 'values' }]
      })
      if (!attr) throw new Error(`Attribute ${id} not found`)
      assertVendorAccess(scope, Number((attr as any).vendorId), 'Unauthorized to view this attribute')
      return attr
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async createAttribute(req: IRequestLocal) {
    try {
      const { name, values } = req.body || {}
      if (!name || !String(name).trim()) throw new Error('attribute name is required')
      const vendorId = this.resolveVendorId(req)
      assertVendorAccess(getVendorScope(req), vendorId, 'Unauthorized to create attribute for this vendor')
      const trimmed = String(name).trim()
      const existing = await ProductAttribute.findOne({ where: { vendorId, name: trimmed } })
      if (existing) {
        const err = new Error(`Attribute "${trimmed}" already exists for this vendor`) as Error & { status?: number }
        err.status = 409
        throw err
      }
      const t = await this.sequelize.transaction()
      try {
        const attr = await ProductAttribute.create({ name: trimmed, vendorId } as any, { transaction: t })
        if (Array.isArray(values) && values.length > 0) {
          const cleaned = values.map((v: any) => String(v).trim()).filter(Boolean)
          if (cleaned.length) {
            await ProductAttributeValue.bulkCreate(
              cleaned.map((value: string) => ({ attributeId: (attr as any).id, value })),
              { transaction: t, ignoreDuplicates: true }
            )
          }
        } else if (typeof values === 'string' && values.trim()) {
          const cleaned = values.split(',').map((v) => v.trim()).filter(Boolean)
          if (cleaned.length)
            await ProductAttributeValue.bulkCreate(
              cleaned.map((value) => ({ attributeId: (attr as any).id, value })),
              { transaction: t, ignoreDuplicates: true }
            )
        }
        await t.commit()
        return await ProductAttribute.findByPk((attr as any).id, {
          include: [{ model: ProductAttributeValue, as: 'values' }]
        })
      } catch (e) {
        await t.rollback()
        throw e
      }
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async updateAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const id = Number((req.params as any).attributeId ?? (req.params as any).id)
      if (!id) throw new Error('attribute id is required')
      const { name, values } = req.body || {}
      const attr: any = await ProductAttribute.findByPk(id, { transaction: t })
      if (!attr) throw new Error(`Attribute ${id} not found`)
      assertVendorAccess(getVendorScope(req), Number(attr.vendorId), 'Unauthorized to update this attribute')
      if (name !== undefined) {
        const trimmed = String(name).trim()
        if (!trimmed) throw new Error('attribute name is required')
        if (trimmed !== attr.name) {
          const dup = await ProductAttribute.findOne({
            where: { vendorId: attr.vendorId, name: trimmed, id: { [Op.ne]: id } },
            transaction: t
          })
          if (dup) {
            const err = new Error(`Attribute "${trimmed}" already exists`) as Error & { status?: number }
            err.status = 409
            throw err
          }
          await attr.update({ name: trimmed }, { transaction: t })
        }
      }
      if (values !== undefined) {
        const cleaned: string[] = Array.isArray(values)
          ? values.map((v: any) => String(v).trim()).filter(Boolean)
          : String(values || '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
        const existingValues: any[] = await ProductAttributeValue.findAll({
          where: { attributeId: id },
          transaction: t
        })
        const existingSet = new Set(existingValues.map((v) => String(v.value).toLowerCase()))
        const wantedLower = new Set(cleaned.map((v) => v.toLowerCase()))
        // delete removed values
        const toDelete = existingValues.filter((v) => !wantedLower.has(String(v.value).toLowerCase()))
        if (toDelete.length) {
          const ids = toDelete.map((v) => v.id)
          // remove variant links before destroying values (cascade via through table)
          // Find variants linked to these values and optionally keep but detach; for vendor-global we just detach
          // Easiest: destroy join rows handled by FK, just delete values
          await ProductAttributeValue.destroy({ where: { id: ids }, transaction: t })
        }
        // create missing
        const missing = cleaned.filter((v) => !existingSet.has(v.toLowerCase()))
        if (missing.length) {
          await ProductAttributeValue.bulkCreate(
            missing.map((value) => ({ attributeId: id, value })),
            { transaction: t, ignoreDuplicates: true }
          )
        }
      }
      await t.commit()
      return await ProductAttribute.findByPk(id, {
        include: [{ model: ProductAttributeValue, as: 'values' }]
      })
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async deleteAttribute(req: IRequestLocal) {
    const t = await this.sequelize.transaction()
    try {
      const id = Number((req.params as any).attributeId ?? (req.params as any).id)
      if (!id) throw new Error('attribute id is required')
      const attr: any = await ProductAttribute.findByPk(id, { transaction: t })
      if (!attr) throw new Error(`Attribute ${id} not found`)
      assertVendorAccess(getVendorScope(req), Number(attr.vendorId), 'Unauthorized to delete this attribute')
      await ProductAttributeValue.destroy({ where: { attributeId: id }, transaction: t })
      await attr.destroy({ transaction: t })
      await t.commit()
      return true
    } catch (error) {
      await t.rollback()
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async createAttributeValue(req: IRequestLocal) {
    try {
      const attributeId = Number((req.params as any).attributeId)
      if (!attributeId) throw new Error('attributeId is required')
      const { values, value } = req.body || {}
      const raw = values ?? value
      if (!raw) throw new Error('value(s) is required')
      const attr: any = await ProductAttribute.findByPk(attributeId)
      if (!attr) throw new Error(`Attribute ${attributeId} not found`)
      assertVendorAccess(getVendorScope(req), Number(attr.vendorId), 'Unauthorized to modify this attribute')
      const list: string[] = Array.isArray(raw)
        ? raw.map((v: any) => String(v).trim()).filter(Boolean)
        : String(raw)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
      if (!list.length) throw new Error('No valid values')
      const existing = await ProductAttributeValue.findAll({
        where: { attributeId, value: { [Op.in]: list } }
      })
      const existingLower = new Set(existing.map((v: any) => String(v.value).toLowerCase()))
      const toCreate = list.filter((v) => !existingLower.has(v.toLowerCase()))
      if (toCreate.length) {
        await ProductAttributeValue.bulkCreate(
          toCreate.map((value) => ({ attributeId, value })),
          { ignoreDuplicates: true }
        )
      }
      return await ProductAttributeValue.findAll({ where: { attributeId }, order: [['id', 'ASC']] })
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async deleteAttributeValue(req: IRequestLocal) {
    try {
      const id = Number((req.params as any).valueId ?? (req.params as any).id)
      if (!id) throw new Error('value id is required')
      const val: any = await ProductAttributeValue.findByPk(id, {
        include: [{ model: ProductAttribute, attributes: ['vendorId'] }]
      })
      if (!val) throw new Error(`Attribute value ${id} not found`)
      const vendorId = (val as any).attribute?.vendorId ?? (val as any).productAttribute?.vendorId
      if (vendorId) assertVendorAccess(getVendorScope(req), Number(vendorId), 'Unauthorized to delete this value')
      await ProductAttributeValue.destroy({ where: { id } })
      return true
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async updateAttributeValue(req: IRequestLocal) {
    try {
      const id = Number((req.params as any).valueId ?? (req.params as any).id)
      const { value } = req.body || {}
      if (!id) throw new Error('value id is required')
      if (!value || !String(value).trim()) throw new Error('value is required')
      const val: any = await ProductAttributeValue.findByPk(id, {
        include: [{ model: ProductAttribute, attributes: ['id', 'vendorId', 'name'] }]
      })
      if (!val) throw new Error(`Attribute value ${id} not found`)
      const vendorId = (val as any).attribute?.vendorId
      if (vendorId) assertVendorAccess(getVendorScope(req), Number(vendorId), 'Unauthorized to update this value')
      // check duplicate within attribute
      const dup = await ProductAttributeValue.findOne({
        where: { attributeId: val.attributeId, value: String(value).trim(), id: { [Op.ne]: id } }
      })
      if (dup) {
        const err = new Error('Value already exists for this attribute') as Error & { status?: number }
        err.status = 409
        throw err
      }
      await val.update({ value: String(value).trim() })
      return val
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async getAttributeValues(req: IRequestLocal) {
    try {
      const attributeId = Number((req.params as any).attributeId)
      if (!attributeId) throw new Error('attributeId is required')
      const attr: any = await ProductAttribute.findByPk(attributeId)
      if (!attr) throw new Error(`Attribute ${attributeId} not found`)
      assertVendorAccess(getVendorScope(req), Number(attr.vendorId), 'Unauthorized to view this attribute')
      return await ProductAttributeValue.findAll({ where: { attributeId }, order: [['id', 'ASC']] })
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }

  async getProductsByAttribute(req: IRequestLocal) {
    try {
      const attributeId = Number((req.params as any).attributeId ?? (req.params as any).id)
      if (!attributeId) throw new Error('attributeId is required')
      const scope = getVendorScope(req)
      const attr: any = await ProductAttribute.findByPk(attributeId)
      if (!attr) throw new Error(`Attribute ${attributeId} not found`)
      assertVendorAccess(scope, Number(attr.vendorId), 'Unauthorized to view this attribute')

      // Find all values of this attribute
      const values: any[] = await ProductAttributeValue.findAll({ where: { attributeId } })
      const valueIds = values.map((v) => v.id)
      if (valueIds.length === 0) return { rows: [], count: 0 }

      // Find variant ids that use any of these values
      const variants: any[] = await ProductVariant.findAll({
        include: [
          {
            model: ProductAttributeValue,
            as: 'attributeValues',
            where: { id: valueIds },
            attributes: [],
            through: { attributes: [] }
          }
        ],
        attributes: ['productId'],
        raw: true
      })
      const productIds = [...new Set(variants.map((v: any) => v.productId).filter(Boolean))]
      if (productIds.length === 0) return { rows: [], count: 0 }

      const { limit, offset } = getPagination(req.query as any)
      const where: any = { id: { [Op.in]: productIds } }
      // scope already checked via attribute vendorId, but also scope products to vendor
      if (scope !== null && scope.length > 0) {
        where.vendorId = { [Op.in]: scope }
      }
      const { rows, count } = await Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['id', 'DESC']],
        distinct: true
      })
      return { rows, count }
    } catch (error) {
      throw ApiError.from(error, (error as any)?.status || 400)
    }
  }
}

import { ERROR } from '#/constant/message'
import database from '#/database'
import Vendor from '#/database/models/vendor'
import { getCtxUser } from '#/libs'
import { ApiError } from '#/response'
import {
  invalidateManyUserAuthCache,
  invalidateUserAuthCache,
  invalidateUsersByVendorId,
  resolveUserIdsByVendorId
} from '#/services/authenticate/userAuth'
import { IVendorStatic } from '#/types/vendor'
import { cacheItem, cacheSet } from '#/utils/caching'
import { Request } from 'express'
import { Sequelize } from 'sequelize'

export default class VendorService {
  vendor: IVendorStatic = database.vendor
  sequelize: Sequelize = database.sequelize
  async create(req: Request) {
    const { name, description, userId } = req.body
    const t = await this.sequelize.transaction()
    try {
      const user = await getCtxUser(req as any)
      if (!user) throw new Error(ERROR.UNAUTHORIZED)
      const _vendor = await Vendor.create(
        {
          name,
          userId: user.id
        },
        {
          transaction: t
        }
      )

      await cacheSet(`vendor:${_vendor.id}`, _vendor)

      await t.commit()
      try {
        await invalidateUserAuthCache(Number(user.id))
      } catch {}
      return {
        vendor: _vendor
      }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async getVendorById(vendorId: Vendor['id']) {
    try {
      const _vendor = await cacheItem({
        key: `vendor:${vendorId}`,
        callback: () => Vendor.findByPk(vendorId)
      })
      if (!_vendor) throw ApiError.notFound('Vendor not found')
      return _vendor as Vendor
    } catch (error) {
      throw error
    }
  }

  /**
   * Update a vendor and invalidate every cached auth context that scopes
   * through it (owner + assigned staff). Invalidates both sides of an
   * owner transfer so neither side serves a stale `vendorIds`.
   */
  async update(id: number, patch: { name?: string; userId?: number }) {
    const vendorId = Number(id)
    if (!Number.isFinite(vendorId)) throw new Error('Invalid vendor id')
    const prev: any = await this.vendor.findByPk(vendorId)
    if (!prev) throw new Error('Vendor not found')
    const prevOwner = Number(prev.get ? prev.get('userId') : prev.userId)

    const payload: Record<string, unknown> = {}
    if (patch.name !== undefined) payload.name = patch.name
    if (patch.userId !== undefined) {
      if (!Number.isFinite(Number(patch.userId))) throw new Error('Invalid userId')
      payload.userId = Number(patch.userId)
    }
    if (!Object.keys(payload).length) throw new Error('No valid fields to update')
    await this.vendor.update(payload, { where: { id: vendorId } })

    try {
      await invalidateUsersByVendorId(vendorId)
      if (Number.isFinite(prevOwner)) await invalidateUserAuthCache(prevOwner)
      if (payload.userId !== undefined && Number(payload.userId) !== prevOwner) {
        await invalidateUserAuthCache(Number(payload.userId))
      }
    } catch {}
    return this.vendor.findByPk(vendorId)
  }

  /**
   * Delete a vendor and invalidate every cached auth context that scoped
   * through it. User ids are resolved BEFORE the delete so staff links
   * removed by cascade are still accounted for.
   */
  async remove(id: number) {
    const vendorId = Number(id)
    if (!Number.isFinite(vendorId)) throw new Error('Invalid vendor id')
    let affected: number[] = []
    try {
      affected = await resolveUserIdsByVendorId(vendorId)
    } catch {
      affected = []
    }
    const deleted = await Vendor.destroy({ where: { id: vendorId } })
    try {
      if (affected.length) await invalidateManyUserAuthCache(affected)
      else await invalidateUsersByVendorId(vendorId)
    } catch {}
    return deleted
  }
  async getVendorByUserId(userId: string) {
    try {
      const resp = await Vendor.findAndCountAll({
        where: {
          userId
        },
        include: {
          model: database.warehouse
        }
      })
      return resp
    } catch (error) {
      throw error
    }
  }
}

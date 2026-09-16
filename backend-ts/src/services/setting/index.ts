import database from '#/database'
import Setting from '#/database/models/setting'
import { ApiError } from '#/response'
import { IRequestLocal } from '#/types/common'
import { evictCachedEntity, getCachedEntity, setCachedEntity } from '#/utils/entity-cache'
import { assertVendorAccess, getVendorScope } from '#/utils/tenant'
import { Sequelize } from 'sequelize'
import VendorService from '../vendor'
import Vendor from '#/database/models/vendor'

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
   * Cache-Aside on `setting:<vendorId>` (the setting's natural key):
   * Hit returns immediately, Miss loads from DB then populates Redis (24h TTL).
   */
  async getForVendor(vendorId?: number | string | null): Promise<Setting> {
    if (!vendorId) throw new Error('vendorId is required')
    const id = Number(vendorId)
    let settings = await getCachedEntity<Setting | null>('setting', id, () =>
      Setting.findOne({ where: { vendorId: id } })
    )
    if (!settings) {
      settings = await Setting.create({
        vendorId: id,
        codePrefix: DEFAULT_CODE_FORMAT,
        codeSuffix: DEFAULT_CODE_FORMAT,
        shipDelivery: DEFAULT_SHIP_DELIVERY
      } as any)
      // Prime `setting:<vendorId>` after the DB insert (best-effort).
      await setCachedEntity('setting', id, settings)
    }
    return settings as Setting
  }

  async get({ vendorId, userId }: { vendorId?: number | string; userId?: number | string }) {
    if (!userId) throw new Error('userId is required')
    if (!vendorId && userId) {
      const vendor = await Vendor.findOne({
        where: { userId: userId }
      })
      if (vendor) return this.getForVendor(vendor.id)
    }
    return this.getForVendor(vendorId)
  }

  async update(req: IRequestLocal, payload: Record<string, any> & { vendorId?: number | string }) {
    const t = await this.sequelize.transaction()
    try {
      const { vendorId, ...data } = payload || {}
      const finalVendorId = this.resolveVendorId(req, vendorId)
      // Ensure the row exists (cache-aside read), then load an authoritative
      // DB instance for the write: a cache Hit returns plain JSON without
      // `.update`/`.reload`, so the write must never reuse it directly.
      await this.getForVendor(finalVendorId)
      const settings = await Setting.findOne({ where: { vendorId: Number(finalVendorId) }, transaction: t })
      if (!settings) throw new Error('Settings not found')

      const updateParams: Record<string, any> = {}
      for (const field of EDITABLE_FIELDS) {
        if (data[field] !== undefined) updateParams[field] = data[field]
      }
      if (data.codePrefix !== undefined) updateParams.codePrefix = data.codePrefix
      if (data.codeSuffix !== undefined) updateParams.codeSuffix = data.codeSuffix
      if (data.shipDelivery !== undefined) updateParams.shipDelivery = data.shipDelivery
      if (data.payment !== undefined) updateParams.payment = data.payment
      // Niche-based UI customization (preset, colors, logo, terminology)
      if (data.appearance !== undefined && typeof data.appearance === 'object') {
        updateParams.appearance = data.appearance
      }

      await settings.update(updateParams, { transaction: t })
      await t.commit()
      // DB succeeded first -> evict `setting:<vendorId>` to avoid stale reads.
      await evictCachedEntity('setting', finalVendorId)
      return settings.reload()
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // Vendor Settings (master-data) section.
  //
  // Managed through PUT /settings/vendor and PATCH /settings/vendor/:id.
  // Authorization is enforced by the route chain
  // (auth -> vendorGuard -> authorize('setting')): PUT/PATCH resolve to the
  // `U` action, so only the Owner (`admin` role bypass) or roles granted
  // `setting:U` (manage_vendor_settings) can reach this code.
  //
  // HISTORICAL SNAPSHOT GUARDRAIL (critical): this section ONLY writes the
  // `vendors` row plus an append-only `vendor_histories` audit entry. It
  // never touches `invoices`/`invoiceDetails` - issued documents keep the
  // snapshot taken at issue time and must remain immutable.
  // ---------------------------------------------------------------------------

  /**
   * Resolve the display/legal name for document generation.
   * legal_name is optional (individual sellers may not have one):
   * legalName -> name -> owner email -> 'INV'.
   */
  resolveVendorDisplayName(vendor: any | null | undefined, ownerEmail?: string | null): string {
    const read = (camel: string, snake: string): unknown => {
      try {
        if (vendor?.get) return vendor.get(camel) ?? vendor.get(snake)
      } catch {
        // fall through to plain property access
      }
      return vendor?.[camel] ?? vendor?.[snake]
    }
    const legal = read('legalName', 'legal_name')
    if (legal != null && String(legal).trim() !== '') return String(legal).trim()
    const brand = read('name', 'name')
    if (brand != null && String(brand).trim() !== '') return String(brand).trim()
    if (ownerEmail != null && String(ownerEmail).trim() !== '') return String(ownerEmail).trim()
    return 'INV'
  }

  /**
   * Active workspace vendor for this request: the primary vendor attached
   * by `auth` (`req.user.vendorId`, i.e. vendorIds[0]), falling back to the
   * first id in scope. Platform admins (null scope) have no active vendor.
   */
  resolveActiveVendorId(req: IRequestLocal): number | null {
    const scope = getVendorScope(req)
    if (scope === null) return null
    const primary = Number((req as any)?.user?.vendorId)
    if (Number.isFinite(primary) && primary > 0) return primary
    const first = scope.length > 0 ? Number(scope[0]) : NaN
    return Number.isFinite(first) && first > 0 ? first : NaN
  }

  /**
   * Normalize a raw vendor-settings payload. Accepts both camelCase and
   * snake_case keys (camelCase wins); trims strings; maps '' -> null for
   * nullable fields. Throws ApiError(400) on invalid values.
   */
  normalizeVendorSettingsPayload(raw: Record<string, any> = {}): Record<string, string | null> {
    const pick = (camel: string, snake: string): unknown => {
      if (raw[camel] !== undefined) return raw[camel]
      return raw[snake]
    }
    const patch: Record<string, string | null> = {}
    const assignNullable = (key: string, value: unknown, max: number, label: string) => {
      if (value === undefined) return
      if (value === null) {
        patch[key] = null
        return
      }
      const trimmed = String(value).trim()
      if (trimmed === '') {
        patch[key] = null
        return
      }
      if (trimmed.length > max) throw ApiError.badRequest(`${label} must be at most ${max} characters`)
      patch[key] = trimmed
    }

    const name = pick('name', 'name')
    if (name !== undefined) {
      if (name === null || String(name).trim() === '') throw ApiError.badRequest('name must be a non-empty string')
      const trimmed = String(name).trim()
      if (trimmed.length > 255) throw ApiError.badRequest('name must be at most 255 characters')
      patch.name = trimmed
    }
    assignNullable('legalName', pick('legalName', 'legal_name'), 255, 'legal_name')
    assignNullable('taxNumber', pick('taxNumber', 'tax_number'), 50, 'tax_number')
    assignNullable('address', pick('address', 'address'), 1000, 'address')
    assignNullable('phone', pick('phone', 'phone'), 30, 'phone')
    assignNullable(
      'invoiceSeriesPrefix',
      pick('invoiceSeriesPrefix', 'invoice_series_prefix'),
      20,
      'invoice_series_prefix'
    )

    const email = pick('email', 'email')
    if (email !== undefined) {
      if (email === null || String(email).trim() === '') {
        patch.email = null
      } else {
        const trimmed = String(email).trim()
        if (trimmed.length > 255) throw ApiError.badRequest('email must be at most 255 characters')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
          throw ApiError.badRequest('email must be a valid email address')
        patch.email = trimmed
      }
    }

    const prefix = patch.invoiceSeriesPrefix
    if (prefix != null && !/^[A-Za-z0-9-]{1,20}$/.test(prefix)) {
      throw ApiError.badRequest('invoice_series_prefix may only contain letters, digits and dashes (max 20)')
    }
    return patch
  }

  /**
   * Read the vendor master-data row for the active (or explicitly
   * requested, scope-checked) vendor, with the computed displayName.
   */
  async getVendorSettings(req: IRequestLocal, vendorId: number | string) {
    const scope = getVendorScope(req)
    assertVendorAccess(scope, Number(vendorId), 'Unauthorized to view this vendor')
    const vendor = await new VendorService().getVendorById(Number(vendorId))
    if (!vendor) throw ApiError.notFound('Vendor not found')
    const ownerEmail = await this.resolveOwnerEmail(vendor)
    const plain = vendor.get ? vendor.get({ plain: true }) : { ...vendor }
    return { ...plain, displayName: this.resolveVendorDisplayName(vendor, ownerEmail) }
  }

  /**
   * Update the vendor master-data row.
   *
   * Strict active-context isolation: the requested vendor (path :id wins,
   * then query/body vendorId, then the active vendor) must equal the
   * request's ACTIVE vendor (`req.user.vendorId`). A user owning several
   * vendors still cannot update a non-active one - cross-vendor writes are
   * rejected with 403 even when the id is inside their scope. Platform
   * admins (null scope) are the only bypass.
   *
   * Never cascades to invoices: only `vendors` + `vendor_histories` are
   * written inside the transaction.
   */
  async updateVendorSettings(
    req: IRequestLocal,
    payload: Record<string, any> = {},
    pathVendorId?: number | string | null
  ) {
    const t = await this.sequelize.transaction()
    try {
      const scope = getVendorScope(req)
      const body = payload ?? {}
      const queryVendorId = (req.query as any)?.vendorId ?? (req.query as any)?.vendor
      const bodyVendorRaw = body.vendorId ?? body.vendor
      const hasPathId = pathVendorId != null && String(pathVendorId).trim() !== ''
      const pathId = hasPathId ? Number(pathVendorId) : NaN
      if (hasPathId && !Number.isFinite(pathId)) throw ApiError.badRequest('Invalid vendor id')
      // Path :id must agree with any vendorId carried for vendorGuard (query/body).
      for (const other of [bodyVendorRaw, queryVendorId]) {
        if (hasPathId && other != null && String(other).trim() !== '' && Number(other) !== pathId) {
          throw ApiError.badRequest('Path vendor id does not match body/query vendorId')
        }
      }
      const requestedRaw = hasPathId ? pathId : (bodyVendorRaw ?? queryVendorId)
      const activeId = this.resolveActiveVendorId(req)

      let target: number
      if (requestedRaw != null && String(requestedRaw).trim() !== '') {
        target = Number(requestedRaw)
        if (!Number.isFinite(target)) throw ApiError.badRequest('Invalid vendor id')
        assertVendorAccess(scope, target, 'Unauthorized to update this vendor')
        if (scope !== null) {
          if (!Number.isFinite(activeId as number)) throw ApiError.forbidden('Unauthorized to update this vendor')
          if (target !== (activeId as number)) {
            throw ApiError.forbidden('Cross-vendor update is not allowed for the active workspace')
          }
        }
      } else {
        if (activeId == null) throw ApiError.badRequest('vendorId is required')
        if (!Number.isFinite(activeId)) throw ApiError.forbidden('Unauthorized to update this vendor')
        target = activeId
      }

      const patch = this.normalizeVendorSettingsPayload(body)
      if (Object.keys(patch).length === 0) throw ApiError.badRequest('No valid fields to update')

      const vendor: any = await database.vendor.findByPk(target, { transaction: t })
      if (!vendor) throw ApiError.notFound('Vendor not found')
      // Defense in depth: the loaded row must be the authorized target.
      const rowId = Number(vendor.get ? vendor.get('id') : vendor.id)
      if (rowId !== target) throw ApiError.forbidden('Unauthorized to update this vendor')

      const before: Record<string, unknown> = {}
      for (const key of Object.keys(patch)) {
        const current = vendor.get ? vendor.get(key) : vendor[key]
        before[key] = current ?? null
      }
      await vendor.update(patch, { transaction: t })

      // Compliance audit trail (best-effort on DBs without the table yet).
      try {
        const historyModel: any = (database as any).vendorHistory
        if (historyModel?.create) {
          await historyModel.create(
            {
              vendorId: target,
              changedBy: Number((req as any)?.user?.id) || null,
              changes: { before, after: { ...patch } }
            },
            { transaction: t }
          )
        }
      } catch {
        // Audit write must not block the master-data update on legacy DBs.
      }

      await t.commit()
      const reloaded: any = await database.vendor.findByPk(target)
      const ownerEmail = await this.resolveOwnerEmail(reloaded)
      const plain = reloaded?.get ? reloaded.get({ plain: true }) : { ...(reloaded ?? {}) }
      return { ...plain, displayName: this.resolveVendorDisplayName(reloaded, ownerEmail) }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /** Best-effort owner email for the legal_name -> name -> owner fallback. */
  private async resolveOwnerEmail(vendor: any): Promise<string | null> {
    try {
      const ownerId = Number(vendor?.get ? vendor.get('userId') : vendor?.userId)
      if (!Number.isFinite(ownerId)) return null
      const owner: any = await database.user.findByPk(ownerId)
      const email = owner?.get ? owner.get('email') : owner?.email
      return email ? String(email) : null
    } catch {
      return null
    }
  }
}

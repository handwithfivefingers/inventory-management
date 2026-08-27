import database from '#/database'
import { Op } from 'sequelize'

/**
 * Multi-tenant (vendor) scoping helpers.
 *
 * `auth` resolves the caller's vendor ids once per request into
 * `req.locals.vendorIds`. Services then MUST scope every read/write by
 * those ids. A user with NO vendor rows is a platform-level account
 * (e.g. seeded admin) and is intentionally unrestricted - represented as
 * `null` so call sites can distinguish "no scope" from "empty scope".
 *
 * IMPORTANT: an empty array means "authenticated but owns nothing" and is
 * treated as DENY ALL, never as unrestricted.
 */

export type TVendorScope = number[] | null

interface ILocalsLike {
  locals?: { vendorIds?: number[] | null; [key: string]: unknown }
  [key: string]: any
}

/** Resolve the request's vendor scope: null = platform admin, [] = deny all. */
export const getVendorScope = (req: ILocalsLike): TVendorScope => {
  const vendorIds = req?.locals?.vendorIds
  if (Array.isArray(vendorIds)) {
    return vendorIds.map(Number).filter((id) => Number.isFinite(id))
  }
  // Middleware did not attach a scope (e.g. internal calls/tests): treat as
  // unrestricted to preserve backwards compatibility for non-HTTP callers.
  return null
}

/** True when the given id is inside the caller's vendor scope. */
export const canAccessVendor = (scope: TVendorScope, vendorId: number | null | undefined): boolean => {
  if (scope === null) return true
  if (vendorId == null) return false
  return scope.includes(Number(vendorId))
}

/**
 * Throw unless the invoice/order/etc row's vendorId is within scope.
 * Platform admins (scope === null) pass through.
 */
export const assertVendorAccess = (
  scope: TVendorScope,
  vendorId: number | null | undefined,
  message = 'Unauthorized to access this resource'
): void => {
  if (!canAccessVendor(scope, vendorId)) {
    const err = new Error(message) as Error & { status?: number }
    err.status = 403
    throw err
  }
}

/**
 * Vendor-scoped `where` fragment for queries, or {} for platform admins.
 * When the client also passes a vendorId filter it must be inside scope.
 */
export const vendorWhere = (
  scope: TVendorScope,
  requestedVendorId?: string | number | null
): Record<string, unknown> => {
  if (requestedVendorId != null && requestedVendorId !== '') {
    assertVendorAccess(scope, Number(requestedVendorId), 'Unauthorized vendor filter')
    return { vendorId: Number(requestedVendorId) }
  }
  if (scope === null) return {}
  return { vendorId: { [Op.in]: scope } }
}

/**
 * Validate that a warehouse belongs to one of the caller's vendors and
 * return its canonical vendorId. Throws 403 on foreign warehouses.
 * Platform admins pass through with the warehouse resolved normally.
 */
export const assertWarehouseAccess = async (
  warehouseId: string | number | null | undefined,
  scope: TVendorScope
): Promise<number | null> => {
  if (warehouseId == null || warehouseId === '') return null
  const warehouse = await database.warehouse.findByPk(Number(warehouseId))
  if (!warehouse) {
    const err = new Error(`Warehouse ${warehouseId} not found`) as Error & { status?: number }
    err.status = 404
    throw err
  }
  assertVendorAccess(scope, (warehouse as any).vendorId, 'Unauthorized to access this warehouse')
  return (warehouse as any).vendorId ?? null
}

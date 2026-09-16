import database from '#/database'
import { Op } from 'sequelize'
import { nextSequence } from '#/utils/sequence'

const INVOICE_SEQUENCE_PADDING = 5
const WAREHOUSE_TAG_PADDING = 3

/**
 * Build a short readable vendor prefix from the vendor name.
 * "Acme Corp" -> "ACM". Falls back to "INV" when the name is missing.
 */
export function buildVendorCode(vendorName?: string | null): string {
  if (!vendorName) return 'INV'
  const sanitized = vendorName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return sanitized.slice(0, 3) || 'INV'
}

/**
 * Build a stable per-warehouse tag from the warehouse id.
 * ID-based (not name-based) so renames never change the numbering
 * namespace and two warehouses can never share a tag.
 * 1 -> "W001", 12 -> "W012", 1234 -> "W1234".
 */
export function buildWarehouseTag(warehouseId: number): string {
  const padded = String(warehouseId).padStart(WAREHOUSE_TAG_PADDING, '0')
  return `W${padded}`
}

/**
 * Atomic-counter scope. One counter row per (vendor, warehouse, year)
 * so concurrent creators for different warehouses never block each other
 * and can never observe the same sequence value.
 */
export function buildSequenceScopeKey(vendorId: number, warehouseId: number): string {
  return `invoice:${vendorId}:${warehouseId}`
}

/** Final human-readable number: ACM-W001-2026-00001 */
export function formatInvoiceNumber(params: {
  vendorCode: string
  warehouseTag: string
  year: number
  sequence: number
}): string {
  const paddedSequence = String(params.sequence).padStart(INVOICE_SEQUENCE_PADDING, '0')
  return `${params.vendorCode}-${params.warehouseTag}-${params.year}-${paddedSequence}`
}

function parseTrailingSequence(invoiceNumber: string): number | null {
  const trailing = invoiceNumber.split('-').pop()
  if (!trailing) return null
  const parsed = Number.parseInt(trailing, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Highest sequence already persisted for this exact (vendor, warehouse,
 * prefix, year) namespace. Seeds the atomic counter lazily on first use.
 *
 * Old-format rows (ACM-2026-00001, without a warehouse tag) intentionally
 * do NOT match the new prefix, so a fresh per-warehouse sequence can start
 * at 1 without colliding - the global UNIQUE on `invoiceNumber` keeps the
 * old and new namespaces disjoint.
 */
export async function findMaxSequenceForScope(params: {
  invoiceModel: { findOne: (options: unknown) => Promise<{ invoiceNumber: string } | null> }
  vendorId: number
  warehouseId: number
  vendorCode: string
  warehouseTag: string
  year: number
}): Promise<number> {
  const { invoiceModel, vendorId, warehouseId, vendorCode, warehouseTag, year } = params
  const prefix = `${vendorCode}-${warehouseTag}-${year}-`
  const latestInvoice = await invoiceModel.findOne({
    where: {
      vendorId,
      warehouseId,
      invoiceNumber: { [Op.like]: `${prefix}%` }
    },
    order: [['id', 'DESC']]
  } as never)
  if (!latestInvoice) return 1
  const parsed = parseTrailingSequence(latestInvoice.invoiceNumber)
  return parsed != null ? parsed + 1 : 1
}

/**
 * Read a custom invoice prefix from a vendor row.
 * Supports the task's `invoicePrefix` naming AND the existing schema
 * `invoiceSeriesPrefix` (`invoice_series_prefix` column), on both Sequelize
 * instances (via `.get`) and plain objects. Trims whitespace; returns `null`
 * when missing/empty so callers fall back to the derived vendor code ("INV").
 */
export function resolveInvoicePrefix(vendor: unknown): string | null {
  if (vendor == null) return null
  const read = (camel: string, snake: string): unknown => {
    try {
      const getter = (vendor as any)?.get
      if (typeof getter === 'function') {
        const viaCamel = (vendor as any).get(camel)
        if (viaCamel !== undefined && viaCamel !== null) return viaCamel
        // `get` may throw for unknown keys on strict models - fall through.
        try {
          const viaSnake = (vendor as any).get(snake)
          if (viaSnake !== undefined && viaSnake !== null) return viaSnake
        } catch {
          // ignore, try plain property access below
        }
      }
    } catch {
      // ignore, try plain property access below
    }
    return (vendor as any)?.[camel] ?? (vendor as any)?.[snake] ?? null
  }
  const candidates = [read('invoicePrefix', 'invoice_prefix'), read('invoiceSeriesPrefix', 'invoice_series_prefix')]
  for (const raw of candidates) {
    if (raw == null) continue
    const trimmed = String(raw).trim()
    if (trimmed !== '') return trimmed
  }
  return null
}

async function resolveVendorCode(vendorId: number): Promise<string> {
  const vendor = await database.vendor.findByPk(vendorId)
  // Custom prefix wins when present; otherwise derive from the vendor name.
  // Both paths fall back to "INV" when empty (null/undefined/""/whitespace).
  const customPrefix = resolveInvoicePrefix(vendor)
  if (customPrefix) return customPrefix
  const row = vendor as { name?: string | null; legalName?: string | null } | null
  // Document fallback chain: legal_name -> brand name. Only affects FUTURE
  // numbers - already-issued invoiceNumbers are immutable snapshots.
  const rawLegal = row?.legalName ?? (vendor as any)?.legal_name ?? null
  const displayName = rawLegal != null && String(rawLegal).trim() !== '' ? String(rawLegal) : row?.name
  return buildVendorCode(displayName)
}

/**
 * Generate a unique invoice number for one (vendor, warehouse, year).
 *
 * Uniqueness comes from three layers:
 * 1. The formatted number embeds vendor + warehouse + year, so different
 *    warehouses can never produce the same string.
 * 2. The sequence comes from the atomic `sequences` counter scoped to
 *    `invoice:{vendorId}:{warehouseId}` + year, so concurrent creators for
 *    the SAME warehouse serialize on their own counter row.
 * 3. The global UNIQUE index on `invoices.invoiceNumber` is the final
 *    safety net (callers retry with a fresh sequence on ER_DUP_ENTRY).
 */
export async function generateInvoiceNumber(params: {
  vendorId: number
  warehouseId: number
  year: number
  transaction?: unknown
}): Promise<string> {
  const { vendorId, warehouseId, year, transaction } = params
  const vendorCode = await resolveVendorCode(vendorId)
  const warehouseTag = buildWarehouseTag(warehouseId)
  const sequence = await nextSequence(buildSequenceScopeKey(vendorId, warehouseId), year, {
    transaction: transaction as never,
    initial: await findMaxSequenceForScope({
      invoiceModel: database.invoice as never,
      vendorId,
      warehouseId,
      vendorCode,
      warehouseTag,
      year
    })
  })
  return formatInvoiceNumber({ vendorCode, warehouseTag, year, sequence })
}

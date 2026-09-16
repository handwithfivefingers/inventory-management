import type {
  InvoiceCreationBody,
  InvoiceLineTotals,
  LegacyInvoiceItem,
  NormalizedInvoiceLine,
  PersistableInvoiceLine,
  SourceInvoiceItem
} from './types'

/** Read a field from either a Sequelize instance or a plain test mock. */
export function readModelField(row: unknown, key: string): unknown {
  try {
    const getter = (row as { get?: (field: string) => unknown })?.get
    if (typeof getter === 'function') return getter.call(row, key)
  } catch {
    // Fall through to plain property access for mocks.
  }
  return (row as Record<string, unknown>)?.[key]
}

function toFiniteNumber(value: unknown): number {
  return Number(value)
}

/**
 * Normalize the three accepted line payloads into one shape:
 * 1. Explicit `lines: [{ order_detail_id, quantity }]` (preferred).
 * 2. Legacy `items: [{ productId, quantity }]` resolved to order lines.
 * 3. Empty payload = one-click full remainder of every order line.
 */
export function normalizeRequestedLines(params: {
  body: InvoiceCreationBody
  orderDetails: unknown[]
  invoicedQuantityByDetailId: Map<number, number>
}): NormalizedInvoiceLine[] {
  const { body, orderDetails, invoicedQuantityByDetailId } = params

  if (body.lines && body.lines.length > 0) {
    return body.lines.map((line) => ({
      orderDetailId: Number(line.order_detail_id ?? line.orderDetailId),
      quantity: Number(line.quantity)
    }))
  }

  if (body.items && body.items.length > 0) {
    return resolveLegacyItemsToOrderLines(body.items, orderDetails)
  }

  return collectRemainingOrderLines(orderDetails, invoicedQuantityByDetailId)
}

function resolveLegacyItemsToOrderLines(
  legacyItems: LegacyInvoiceItem[],
  orderDetails: unknown[]
): NormalizedInvoiceLine[] {
  const normalized: NormalizedInvoiceLine[] = []
  for (const item of legacyItems) {
    const matchingDetail = orderDetails.find(
      (orderDetail) => Number(readModelField(orderDetail, 'productId')) === Number(item.productId)
    )
    if (!matchingDetail) {
      throw new Error(`Product ${item.productId} is not on this order`)
    }
    normalized.push({
      orderDetailId: Number(readModelField(matchingDetail, 'id')),
      quantity: Number((item as { quantity?: unknown }).quantity)
    })
  }
  return normalized
}

function collectRemainingOrderLines(
  orderDetails: unknown[],
  invoicedQuantityByDetailId: Map<number, number>
): NormalizedInvoiceLine[] {
  const remaining: NormalizedInvoiceLine[] = []
  for (const orderDetail of orderDetails) {
    const detailId = Number(readModelField(orderDetail, 'id'))
    const orderedQuantity = Number(readModelField(orderDetail, 'quantity'))
    const remainingQuantity = orderedQuantity - (invoicedQuantityByDetailId.get(detailId) ?? 0)
    if (remainingQuantity > 0) {
      remaining.push({ orderDetailId: detailId, quantity: remainingQuantity })
    }
  }
  return remaining
}

/**
 * Guard every requested line: exists on this order, positive integer qty,
 * no duplicates, never exceeds (ordered - already invoiced).
 */
export function validateRequestedLines(params: {
  requestedLines: NormalizedInvoiceLine[]
  orderDetailById: Map<number, unknown>
  invoicedQuantityByDetailId: Map<number, number>
}): void {
  const { requestedLines, orderDetailById, invoicedQuantityByDetailId } = params
  if (requestedLines.length === 0) {
    throw new Error('No remaining quantity to invoice on this order')
  }
  const seenDetailIds = new Set<number>()
  for (const requestedLine of requestedLines) {
    assertLineHasOrderDetailId(requestedLine, seenDetailIds)
    assertLineQuantityIsPositiveInteger(requestedLine)
    assertLineWithinRemainingQuantity(requestedLine, orderDetailById, invoicedQuantityByDetailId)
  }
}

function assertLineHasOrderDetailId(line: NormalizedInvoiceLine, seenDetailIds: Set<number>): void {
  if (!Number.isFinite(line.orderDetailId)) {
    throw new Error('order_detail_id is required for each line')
  }
  if (seenDetailIds.has(line.orderDetailId)) {
    throw new Error(`Duplicate line for order detail ${line.orderDetailId}`)
  }
  seenDetailIds.add(line.orderDetailId)
}

function assertLineQuantityIsPositiveInteger(line: NormalizedInvoiceLine): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    throw new Error('Invoice quantity must be > 0')
  }
  if (!Number.isInteger(line.quantity)) {
    throw new Error('Invoice quantity must be an integer')
  }
}

function assertLineWithinRemainingQuantity(
  requestedLine: NormalizedInvoiceLine,
  orderDetailById: Map<number, unknown>,
  invoicedQuantityByDetailId: Map<number, number>
): void {
  const orderDetail = orderDetailById.get(requestedLine.orderDetailId)
  if (!orderDetail) {
    throw new Error(`Order detail ${requestedLine.orderDetailId} is not on this order`)
  }
  const orderedQuantity = Number(readModelField(orderDetail, 'quantity'))
  const alreadyInvoiced = invoicedQuantityByDetailId.get(requestedLine.orderDetailId) ?? 0
  const remainingQuantity = orderedQuantity - alreadyInvoiced
  if (requestedLine.quantity > remainingQuantity) {
    throw new Error(
      `Quantity ${requestedLine.quantity} exceeds remaining ${remainingQuantity} ` +
        `for order detail ${requestedLine.orderDetailId} (ordered ${orderedQuantity}, invoiced ${alreadyInvoiced})`
    )
  }
}

/**
 * FULL only when every order line with remaining qty is included at its
 * full remaining quantity. Anything else is PARTIAL.
 */
export function isFullCoverageInvoice(params: {
  orderDetails: unknown[]
  requestedLines: NormalizedInvoiceLine[]
  invoicedQuantityByDetailId: Map<number, number>
}): boolean {
  const { orderDetails, requestedLines, invoicedQuantityByDetailId } = params
  for (const orderDetail of orderDetails) {
    const detailId = Number(readModelField(orderDetail, 'id'))
    const remainingQuantity =
      Number(readModelField(orderDetail, 'quantity')) - (invoicedQuantityByDetailId.get(detailId) ?? 0)
    if (remainingQuantity <= 0) continue
    const requestedLine = requestedLines.find((line) => line.orderDetailId === detailId)
    if (!requestedLine || requestedLine.quantity !== remainingQuantity) return false
  }
  return true
}

/** Expand normalized lines with the order's product/variant/price snapshot. */
export function buildSourceItems(params: {
  requestedLines: NormalizedInvoiceLine[]
  orderDetailById: Map<number, unknown>
  orderVAT: number
}): SourceInvoiceItem[] {
  return params.requestedLines.map((requestedLine) => {
    const orderDetail = params.orderDetailById.get(requestedLine.orderDetailId) as Record<string, unknown>
    return {
      orderDetailId: requestedLine.orderDetailId,
      productId: toFiniteNumber(readModelField(orderDetail, 'productId')),
      variantId: (readModelField(orderDetail, 'variantId') as number | null) ?? null,
      quantity: requestedLine.quantity,
      unitPrice: Number(readModelField(orderDetail, 'price') || 0),
      taxRate: Number(params.orderVAT || 0),
      discount: 0
    }
  })
}

/** Price each line and roll up subtotal + tax. Discount/surcharge apply at header level. */
export function calculateLineTotals(sourceItems: SourceInvoiceItem[]): InvoiceLineTotals {
  let subtotal = 0
  let taxAmount = 0
  const persistableLines: PersistableInvoiceLine[] = sourceItems.map((sourceItem) => {
    const lineSubtotal = sourceItem.quantity * sourceItem.unitPrice
    const lineTax = (lineSubtotal * (sourceItem.taxRate || 0)) / 100
    const lineDiscount = sourceItem.discount || 0
    subtotal += lineSubtotal
    taxAmount += lineTax
    return {
      ...sourceItem,
      taxAmount: lineTax,
      subtotal: lineSubtotal - lineDiscount + lineTax
    }
  })
  return { persistableLines, subtotal, taxAmount }
}

export function indexOrderDetailsById(orderDetails: unknown[]): Map<number, unknown> {
  const orderDetailById = new Map<number, unknown>()
  for (const orderDetail of orderDetails) {
    orderDetailById.set(Number(readModelField(orderDetail, 'id')), orderDetail)
  }
  return orderDetailById
}

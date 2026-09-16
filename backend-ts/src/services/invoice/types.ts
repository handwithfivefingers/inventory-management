/**
 * Shared input/output shapes for the invoice creation flow.
 * Kept in one place so `index.ts` stays a thin orchestrator and each
 * helper owns a single responsibility.
 */

export interface InvoiceLineRequest {
  order_detail_id?: number
  orderDetailId?: number
  quantity: number
}

export interface NormalizedInvoiceLine {
  orderDetailId: number
  quantity: number
}

export interface LegacyInvoiceItem {
  productId: number
  quantity: number
}

export interface InvoiceCreationBody {
  orderId: number
  lines?: InvoiceLineRequest[]
  items?: LegacyInvoiceItem[]
  customerId?: number
  warehouseId?: number
  vendorId?: number
  VAT?: number
  discount?: number
  surcharge?: number
  paymentType?: 'cash' | 'transfer' | 'credit'
  status?: string
  dueDate?: unknown
  notes?: string
}

export interface SourceInvoiceItem {
  orderDetailId: number
  productId: number
  variantId: number | null
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
}

export interface PersistableInvoiceLine extends SourceInvoiceItem {
  taxAmount: number
  subtotal: number
}

export interface InvoiceLineTotals {
  persistableLines: PersistableInvoiceLine[]
  subtotal: number
  taxAmount: number
}

export interface InvoiceFinancialDefaults {
  effectiveVAT: number
  effectiveSurcharge: number
  effectivePaymentType: 'cash' | 'transfer' | 'credit'
  priorNonCancelledCount: number
  isFullCoverage: boolean
}

export interface InvoicePaymentSplit {
  total: number
  paidAmount: number
  remainingAmount: number
  effectiveStatus: string
}

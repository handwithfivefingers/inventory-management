import { InvoiceController } from '#/controllers/invoice'
import express from 'express'

const router = express.Router()

// GET /api/invoices - List all invoices
router.get('/', new InvoiceController().getInvoices)

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', new InvoiceController().getInvoiceById)

// POST /api/invoices - Create new invoice
router.post('/', new InvoiceController().create)

// PUT /api/invoices/:id - Update invoice
router.put('/:id', new InvoiceController().update)

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', new InvoiceController().delete)

// PUT /api/invoices/:id/status - Update invoice status
router.put('/:id/status', new InvoiceController().updateStatus)

export default router

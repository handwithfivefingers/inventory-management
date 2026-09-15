import { InvoiceController } from '#/controllers/invoice'
import express from 'express'
import { invoiceCreateValidation, invoiceIdValidation, invoiceListValidation, invoiceStatusValidation, invoiceUpdateValidation } from './validator'

const router = express.Router()

router.get(
  '/',
  invoiceListValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'List invoices'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  new InvoiceController().getInvoices
)
router.get(
  '/:id',
  invoiceIdValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'Get invoice by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new InvoiceController().getInvoiceById
)
router.post(
  '/',
  invoiceCreateValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'Create invoice'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/InvoiceBody' } } */
  new InvoiceController().create
)
router.put(
  '/:id',
  invoiceUpdateValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'Update invoice'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { paymentType: { type: 'string', enum: ['cash','transfer','credit'] }, note: { type: 'string' } } } } */
  new InvoiceController().update
)
router.delete(
  '/:id',
  invoiceIdValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'Delete invoice'
  // #swagger.security = [{ "bearerAuth": [] }]
  new InvoiceController().delete
)
router.put(
  '/:id/status',
  invoiceStatusValidation as any,
  // #swagger.tags = ['Invoices']
  // #swagger.summary = 'Update invoice status'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { status: { type: 'string', enum: ['draft','paid','cancelled'], example: 'paid' } }, required: ['status'] } } */
  new InvoiceController().updateStatus
)

export default router

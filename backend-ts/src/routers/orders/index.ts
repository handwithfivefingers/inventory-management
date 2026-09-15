import OrderController from '#/controllers/order'
import express from 'express'
import {
  orderCreateValidation,
  orderIdValidation,
  orderInvoiceCreateValidation,
  orderListValidation,
  orderReturnValidation,
  orderUpdateValidation
} from './validator'
const Router = express.Router()

Router.get(
  '/',
  orderListValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'List orders'
  // #swagger.description = 'Paginated order list, vendor-scoped'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Page size' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer', description: 'Offset' } */
  new OrderController().getOrders
)
Router.get(
  '/:id',
  orderIdValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Get order by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'string', description: 'Warehouse filter' } */
  new OrderController().getOrderById
)
Router.post(
  '/create',
  orderCreateValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Create sales order (auto-creates invoice if not import)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/OrderBody' } } */
  new OrderController().create
)
Router.put(
  '/:id',
  orderUpdateValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Update order'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/OrderBody' } } */
  new OrderController().update
)
Router.post(
  '/:id/invoices',
  orderInvoiceCreateValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Create invoice from order lines (partial allowed)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { lines: { type: 'array', items: { type: 'object' } } }, required: ['lines'] } } */
  new OrderController().createOrderInvoice
)
Router.post(
  '/:id/return',
  orderReturnValidation as any,
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Return part or all of a sale order'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { items: { type: 'array', items: { type: 'object' } }, reason: { type: 'string' }, refundAmount: { type: 'number' } }, required: ['items'] } } */
  new OrderController().returnOrder
)

export default Router

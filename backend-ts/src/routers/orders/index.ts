import OrderController from '#/controllers/order'
import express from 'express'
const Router = express.Router()

Router.get(
  '/',
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
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Get order by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'string', description: 'Warehouse filter' } */
  new OrderController().getOrderById
)
Router.post(
  '/create',
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Create sales order (auto-creates invoice if not import)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/OrderBody' } } */
  new OrderController().create
)
Router.put(
  '/:id',
  // #swagger.tags = ['Orders']
  // #swagger.summary = 'Update order'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/OrderBody' } } */
  new OrderController().update
)

export default Router

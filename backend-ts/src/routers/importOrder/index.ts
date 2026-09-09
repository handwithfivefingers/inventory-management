import ImportOrderController from '#/controllers/importOrder'
import express from 'express'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['ImportOrders']
  // #swagger.summary = 'List import orders'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  new ImportOrderController().getOrders
)
Router.get(
  '/:id',
  // #swagger.tags = ['ImportOrders']
  // #swagger.summary = 'Get import order by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ImportOrderController().getOrderById
)
Router.post(
  '/',
  // #swagger.tags = ['ImportOrders']
  // #swagger.summary = 'Create import order'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { providerId: { type: 'integer' }, warehouseId: { type: 'integer' }, items: { type: 'array', items: { type: 'object' } } }, required: ['providerId'] } } */
  new ImportOrderController().create
)

export default Router

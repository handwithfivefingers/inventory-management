import { WarehouseController } from '#/controllers/warehouse'
import express from 'express'
const route = express.Router()

route.get(
  '/',
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'List warehouses'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  new WarehouseController().get
)
route.get(
  '/:id',
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Get warehouse by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string' } */
  new WarehouseController().getWarehouseById
)
route.post(
  '/',
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Create warehouse'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WarehouseBody' } } */
  new WarehouseController().create
)
route.put(
  '/:id',
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Update warehouse'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WarehouseBody' } } */
  new WarehouseController().update
)

export default route

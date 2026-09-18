import { WarehouseController } from '#/controllers/warehouse'
import express from 'express'
import {
  warehouseCreateValidation,
  warehouseIdValidation,
  warehouseListValidation,
  warehouseTransferValidation,
  warehouseUpdateValidation
} from './validator'
const route = express.Router()

route.get(
  '/',
  warehouseListValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'List warehouses'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  new WarehouseController().get as any
)
route.post(
  '/transfer',
  warehouseTransferValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Transfer stock between warehouses (items: [{productId, variantId?, quantity}])'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { fromWarehouseId: { type: 'integer' }, toWarehouseId: { type: 'integer' }, note: { type: 'string' }, items: { type: 'array', items: { type: 'object' } } }, required: ['fromWarehouseId','toWarehouseId','items'] } } */
  new WarehouseController().transferStock as any
)
route.get(
  '/:id',
  warehouseIdValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Get warehouse by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string' } */
  new WarehouseController().getWarehouseById as any
)
route.post(
  '/',
  warehouseCreateValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Create warehouse'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WarehouseBody' } } */
  new WarehouseController().create as any
)
route.put(
  '/:id',
  warehouseUpdateValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Update warehouse'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/WarehouseBody' } } */
  new WarehouseController().update as any
)
route.delete(
  '/:id',
  warehouseIdValidation as any,
  // #swagger.tags = ['Warehouses']
  // #swagger.summary = 'Soft-delete a non-main warehouse with no inventory or unfinished orders'
  // #swagger.security = [{ "bearerAuth": [] }]
  new WarehouseController().delete as any
)

export default route

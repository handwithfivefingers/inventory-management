import { CategoriesController } from '#/controllers/categories'
import express from 'express'
const route = express.Router()

route.get(
  '/',
  // #swagger.tags = ['Categories']
  // #swagger.summary = 'List categories'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  new CategoriesController().get
)
route.get(
  '/:id',
  // #swagger.tags = ['Categories']
  // #swagger.summary = 'Get category by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new CategoriesController().getById
)
route.post(
  '/',
  // #swagger.tags = ['Categories']
  // #swagger.summary = 'Create category'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string', description: 'Vendor ID (query)' } */
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/CategoryBody' } } */
  new CategoriesController().create
)
route.post(
  '/:id',
  // #swagger.tags = ['Categories']
  // #swagger.summary = 'Update category'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string' }, description: { type: 'string' } } } } */
  new CategoriesController().update
)
route.delete(
  '/:id',
  // #swagger.tags = ['Categories']
  // #swagger.summary = 'Delete category'
  // #swagger.security = [{ "bearerAuth": [] }]
  new CategoriesController().delete
)

export default route

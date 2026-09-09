import { TagsController } from '#/controllers/tags'
import express from 'express'
const route = express.Router()

route.get(
  '/',
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'List tags'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string', required: true } */
  new TagsController().get
)
route.get(
  '/:id',
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Get tag by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new TagsController().getById
)
route.post(
  '/',
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Create tag'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/TagBody' } } */
  new TagsController().create
)
route.post(
  '/:id',
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Update tag'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { id: { type: 'integer' }, name: { type: 'string' } }, required: ['id'] } } */
  new TagsController().update
)

export default route

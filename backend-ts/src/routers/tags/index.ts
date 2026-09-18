import { TagsController } from '#/controllers/tags'
import express from 'express'
import { tagCreateValidation, tagIdValidation, tagListValidation, tagUpdateValidation } from './validator'
const route = express.Router()

route.get(
  '/',
  tagListValidation as any,
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'List tags'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string', required: true } */
  new TagsController().get as any
)
route.get(
  '/:id',
  tagIdValidation as any,
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Get tag by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new TagsController().getById as any
)
route.post(
  '/',
  tagCreateValidation as any,
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Create tag'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/TagBody' } } */
  new TagsController().create as any
)
route.post(
  '/:id',
  tagUpdateValidation as any,
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Update tag'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { id: { type: 'integer' }, name: { type: 'string' } }, required: ['id'] } } */
  new TagsController().update as any
)

route.delete(
  '/:id',
  tagIdValidation as any,
  // #swagger.tags = ['Tags']
  // #swagger.summary = 'Update tag'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { id: { type: 'integer' }, name: { type: 'string' } }, required: ['id'] } } */
  new TagsController().delete as any
)

export default route

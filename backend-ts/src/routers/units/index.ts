import { UnitsController } from '#/controllers/units'
import express from 'express'
import { unitCreateValidation, unitIdValidation, unitListValidation, unitUpdateValidation } from './validator'
const route = express.Router()

route.get(
  '/',
  unitListValidation as any,
  // #swagger.tags = ['Units']
  // #swagger.summary = 'List units'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string' } */
  new UnitsController().get as any
)
route.get(
  '/:id',
  unitIdValidation as any,
  // #swagger.tags = ['Units']
  // #swagger.summary = 'Get unit by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendor'] = { in: 'query', type: 'string' } */
  new UnitsController().getById as any
)
route.post(
  '/',
  unitCreateValidation as any,
  // #swagger.tags = ['Units']
  // #swagger.summary = 'Create unit'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/UnitBody' } } */
  new UnitsController().create as any
)
route.post(
  '/:id',
  unitUpdateValidation as any,
  // #swagger.tags = ['Units']
  // #swagger.summary = 'Update unit'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { id: { type: 'integer' }, name: { type: 'string' } }, required: ['id'] } } */
  new UnitsController().update as any
)
route.delete(
  '/:id',
  unitIdValidation as any,
  // #swagger.tags = ['Units']
  // #swagger.summary = 'Update unit'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { id: { type: 'integer' }, name: { type: 'string' } }, required: ['id'] } } */
  new UnitsController().delete as any
)

export default route

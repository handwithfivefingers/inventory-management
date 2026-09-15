import ShiftController from '#/controllers/shift'
import express from 'express'
import { shiftCloseValidation, shiftCurrentValidation, shiftIdValidation, shiftOpenValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Shifts']
  // #swagger.summary = 'List shifts'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ShiftController().get
)
Router.get(
  '/current',
  shiftCurrentValidation as any,
  // #swagger.tags = ['Shifts']
  // #swagger.summary = 'Get current shift'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'string' } */
  new ShiftController().getCurrent
)
Router.get(
  '/:id',
  shiftIdValidation as any,
  // #swagger.tags = ['Shifts']
  // #swagger.summary = 'Get shift by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ShiftController().getById
)
Router.post(
  '/open',
  shiftOpenValidation as any,
  // #swagger.tags = ['Shifts']
  // #swagger.summary = 'Open a new shift'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { warehouseId: { type: 'integer' }, openingCash: { type: 'number' } }, required: ['warehouseId'] } } */
  new ShiftController().open
)
Router.post(
  '/:id/close',
  shiftCloseValidation as any,
  // #swagger.tags = ['Shifts']
  // #swagger.summary = 'Close a shift'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { closingCash: { type: 'number' }, note: { type: 'string' } } } } */
  new ShiftController().close
)

export default Router

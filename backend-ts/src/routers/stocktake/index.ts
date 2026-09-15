import { StocktakeController } from '#/controllers/stocktake'
import express from 'express'
import { stocktakeIdValidation, stocktakeLinesValidation, stocktakeStartValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'List stocktake sessions'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StocktakeController().list
)
Router.get(
  '/:id',
  stocktakeIdValidation as any,
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'Get stocktake session with details'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StocktakeController().getById
)
Router.post(
  '/',
  stocktakeStartValidation as any,
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'Start (open) a stocktake session for a warehouse'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { warehouseId: { type: 'integer' }, note: { type: 'string' } }, required: ['warehouseId'] } } */
  new StocktakeController().start
)
Router.put(
  '/:id/lines',
  stocktakeLinesValidation as any,
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'Save counted quantities'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { lines: { type: 'array', items: { type: 'object' } } }, required: ['lines'] } } */
  new StocktakeController().updateLines
)
Router.post(
  '/:id/complete',
  stocktakeIdValidation as any,
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'Complete session: apply variances to inventory'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StocktakeController().complete
)
Router.post(
  '/:id/cancel',
  stocktakeIdValidation as any,
  // #swagger.tags = ['Stocktake']
  // #swagger.summary = 'Cancel an open session'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StocktakeController().cancel
)

export default Router

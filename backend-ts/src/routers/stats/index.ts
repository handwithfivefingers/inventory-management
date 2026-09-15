import { StatsController } from '#/controllers/stats'
import express from 'express'
import { dashboardValidation } from './validator'
const Router = express.Router()

Router.get(
  '/dashboard',
  dashboardValidation as any,
  // #swagger.tags = ['Stats']
  // #swagger.summary = 'Get dashboard statistics'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['days'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['from'] = { in: 'query', type: 'string' } */
  /* #swagger.parameters['to'] = { in: 'query', type: 'string' } */
  /* #swagger.parameters['groupBy'] = { in: 'query', type: 'string', description: 'day | month' } */
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'string' } */
  /* #swagger.parameters['lowStockThreshold'] = { in: 'query', type: 'integer' } */
  new StatsController().getDashboard
)

export default Router

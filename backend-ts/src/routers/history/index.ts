import { HistoryController } from '#/controllers/history'
import express from 'express'
import { historyIdValidation } from './validator'
const Router = express.Router()

Router.get(
  '/:id',
  historyIdValidation as any,
  // #swagger.tags = ['History']
  // #swagger.summary = 'Get stock history by product ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new HistoryController().getHistoryByProductId
)
export default Router

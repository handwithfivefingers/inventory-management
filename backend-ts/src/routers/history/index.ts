import { HistoryController } from '#/controllers/history'
import express from 'express'
const Router = express.Router()

Router.get(
  '/:id',
  // #swagger.tags = ['History']
  // #swagger.summary = 'Get stock history by product ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new HistoryController().getHistoryByProductId
)
export default Router

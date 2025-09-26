import { HistoryController } from '#/controllers/history'
import express from 'express'
const Router = express.Router()
Router.get('/:id', new HistoryController().getHistoryByProductId)
export default Router

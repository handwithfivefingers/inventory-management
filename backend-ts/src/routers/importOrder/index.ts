import ImportOrderController from '#/controllers/importOrder'
import express from 'express'
const Router = express.Router()

Router.get('/', new ImportOrderController().getOrders)
Router.get('/:id', new ImportOrderController().getOrderById)
Router.post('/', new ImportOrderController().create)

export default Router

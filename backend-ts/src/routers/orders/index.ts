// const express = require('express')
// const route = express.Router()
// const { OrderController } = require('../controllers')

// route.get('/', new OrderController().getOrders)

// route.get('/:id', new OrderController().getOrderById)

// route.post('/create', new OrderController().create)

// module.exports = route

import OrderController from '#/controllers/order'
import Router from '#/core/router'

// Router.get('/', new VendorController().get)
Router.get('/', new OrderController().getOrders)

const OrderRouter = Router

export default OrderRouter

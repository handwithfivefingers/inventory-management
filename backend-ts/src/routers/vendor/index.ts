// const express = require('express')
// const route = express.Router()
// const { VendorController } = require('../controllers')

import VendorController from '#/controllers/vendor'
import Router from '#/core/router'

// Router.get('/', new VendorController().get)
Router.post('/', new VendorController().create)

const VendorRouter = Router

export default VendorRouter

// const express = require('express')
// const route = express.Router()
// const { VendorController } = require('../controllers')

import VendorController from '#/controllers/vendor'
import express from 'express'
const Router = express.Router()
// Router.get('/', new VendorController().get)
Router.post('/', new VendorController().create)

export default Router

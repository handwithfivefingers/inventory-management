// const { auth } = require("@src/middleware/authenticate");
// const { userInfoMiddleware } = require("@src/middleware/userInformation");
// const express = require("express");
// const route = express.Router();

// route.use("/auth", require("./authenticate"));

// route.use("/permission", require("./permission"));

// route.use("/role", require("./role"));

// route.use("/products", require("./product"));

// route.use("/vendors", auth, require("./vendor"));

// route.use("/warehouses", auth, require("./warehouse"));

// route.use("/providers", auth, require("./provider"));

// route.use("/orders", auth, require("./orders"));

// route.use("/import-order", auth, require("./importOrder"));

// route.use("/categories", auth, require("./categories"));

// route.use("/tags", auth, require("./tags"));

// route.use("/units", auth, require("./units"));

// route.use("/financial", auth, require("./financial"));

// route.use("/history", auth, require("./history"));

// route.use("/qr", require("./vietqr"));

// module.exports = route;
// import Router from '#/core/router'
import express from 'express'
import authenticate from './authenticate'
import vendorRouter from './vendor'
import product from './product'
import orders from './orders'
import provider from './provider'
import warehouse from './warehouse'
import categories from './categories'
import tags from './tags'
import units from './units'
import financial from './financial'
// import history from './history'
// import qr from './qr'
import { auth } from '#/middleware/authenticate'
const router = express.Router()

router.use('/auth', authenticate)
router.use('/vendor', auth, vendorRouter)
router.use('/orders', auth, orders)
router.use('/products', auth, product)
router.use('/providers', auth, provider)
router.use('/warehouses', auth, warehouse)
router.use('/categories', auth, categories)
router.use('/tags', auth, tags)
router.use('/units', auth, units)
router.use('/financial', auth, financial)
// router.use('/history', auth, history)
// router.use('/qr', auth, qr)
export default router

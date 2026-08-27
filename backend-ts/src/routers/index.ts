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
import stats from './stats'
import history from './history'
import role from './role'
import customer from './customer'
import invoice from './invoice'
import staff from './staff'
import shift from './shift'
import setting from './setting'
import importOrder from './importOrder'
import permission from './permission'
// import qr from './qr'
import { auth } from '#/middleware/authenticate'
import authorize from '#/middleware/authorize'
const router = express.Router()

router.use('/auth', authenticate)
router.use('/vendor', auth, vendorRouter)
router.use('/orders', auth, authorize('order'), orders)
router.use('/products', auth, authorize('product'), product)
router.use('/providers', auth, authorize('provider'), provider)
router.use('/warehouses', auth, authorize('warehouse'), warehouse)
router.use('/categories', auth, authorize('category'), categories)
router.use('/tags', auth, authorize('tag'), tags)
router.use('/units', auth, authorize('unit'), units)
router.use('/financial', auth, authorize('financial'), financial)
router.use('/stats', auth, authorize('dashboard'), stats)
router.use('/history', auth, authorize('product'), history)
router.use('/roles', auth, authorize('role'), role)
router.use('/customers', auth, authorize('customer'), customer)
router.use('/invoices', auth, authorize('invoice'), invoice)
router.use('/staff', auth, authorize('staff'), staff)
// Opening a shift creates it (C); closing an existing one updates it (U).
router.use('/shift', auth, authorize('shift', { 'POST /close': 'U' }), shift)
router.use('/settings', auth, authorize('setting'), setting)
router.use('/import-order', auth, authorize('import-order'), importOrder)
// Canonical module catalog for role editors & permission sync status.
router.use('/permissions', auth, permission)
// router.use('/qr', auth, qr)
export default router

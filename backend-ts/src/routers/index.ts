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
// import qr from './qr'
import { auth } from '#/middleware/authenticate'
import authorize from '#/middleware/authorize'
import permission from './permission'
import { vendorGuard } from '#/middleware/vendorGuard'
const router = express.Router()

router.use('/auth', authenticate)
router.use('/vendor', auth, vendorGuard, vendorRouter)
router.use('/orders', auth, vendorGuard, authorize('order'), orders)
router.use('/products', auth, vendorGuard, authorize('product'), product)
router.use('/providers', auth, vendorGuard, authorize('provider'), provider)
router.use('/warehouses', auth, vendorGuard, authorize('warehouse'), warehouse)
router.use('/categories', auth, vendorGuard, authorize('category'), categories)
router.use('/tags', auth, vendorGuard, authorize('tag'), tags)
router.use('/units', auth, vendorGuard, authorize('unit'), units)
router.use('/financial', auth, vendorGuard, authorize('financial'), financial)
router.use('/stats', auth, vendorGuard, authorize('dashboard'), stats)
router.use('/history', auth, vendorGuard, authorize('product'), history)
router.use('/roles', auth, vendorGuard, authorize('role'), role)
router.use('/customers', auth, vendorGuard, authorize('customer'), customer)
router.use('/invoices', auth, vendorGuard, authorize('invoice'), invoice)
router.use('/staff', auth, vendorGuard, authorize('staff'), staff)
// Opening a shift creates it (C); closing an existing one updates it (U).
router.use('/shift', auth, vendorGuard, authorize('shift', { 'POST /close': 'U' }), shift)
router.use('/settings', auth, vendorGuard, authorize('setting'), setting)
router.use('/import-order', auth, vendorGuard, authorize('import-order'), importOrder)
router.use('/permission', auth, vendorGuard, authorize('permission'), permission)
// Canonical module catalog for role editors & permission sync status.
// router.use('/qr', auth, qr)
export default router

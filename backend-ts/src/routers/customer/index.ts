import { CustomerController } from '#/controllers/customer'
import express from 'express'

const router = express.Router()

// GET /api/customers - List all customers
router.get('/', new CustomerController().getCustomers)

// GET /api/customers/:id - Get customer by ID
router.get('/:id', new CustomerController().getCustomerById)

// POST /api/customers - Create new customer
router.post('/', new CustomerController().create)

// PUT /api/customers/:id - Update customer
router.put('/:id', new CustomerController().update)

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', new CustomerController().delete)

export default router

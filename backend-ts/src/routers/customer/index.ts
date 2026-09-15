import { CustomerController } from '#/controllers/customer'
import express from 'express'
import { customerCreateValidation, customerIdValidation, customerListValidation, customerUpdateValidation } from './validator'

const router = express.Router()

router.get(
  '/',
  customerListValidation as any,
  // #swagger.tags = ['Customers']
  // #swagger.summary = 'List customers'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['search'] = { in: 'query', type: 'string' } */
  new CustomerController().getCustomers
)
router.get(
  '/:id',
  customerIdValidation as any,
  // #swagger.tags = ['Customers']
  // #swagger.summary = 'Get customer by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new CustomerController().getCustomerById
)
router.post(
  '/',
  customerCreateValidation as any,
  // #swagger.tags = ['Customers']
  // #swagger.summary = 'Create customer'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/CustomerBody' } } */
  new CustomerController().create
)
router.put(
  '/:id',
  customerUpdateValidation as any,
  // #swagger.tags = ['Customers']
  // #swagger.summary = 'Update customer'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/CustomerBody' } } */
  new CustomerController().update
)
router.delete(
  '/:id',
  customerIdValidation as any,
  // #swagger.tags = ['Customers']
  // #swagger.summary = 'Delete customer'
  // #swagger.security = [{ "bearerAuth": [] }]
  new CustomerController().delete
)

export default router

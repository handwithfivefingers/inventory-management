import { idParam, paginationQuery, validate } from '#/middleware/validate'
import { body } from 'express-validator'

const invoiceListValidation = validate([...paginationQuery])

const invoiceIdValidation = validate([idParam('id')])

const invoiceCreateValidation = validate([
  body('orderId').optional().isInt({ min: 1 }).withMessage('orderId must be a positive integer').toInt(),
  body('paymentType')
    .optional()
    .isIn(['cash', 'transfer', 'credit'])
    .withMessage('paymentType must be one of cash, transfer, credit'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt(),
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt(),
  body('customerId').optional().isInt({ min: 1 }).withMessage('customerId must be a positive integer').toInt(),
  body('note').optional().isString().withMessage('note must be a string')
])

const invoiceUpdateValidation = validate([
  idParam('id'),
  body('paymentType')
    .optional()
    .isIn(['cash', 'transfer', 'credit'])
    .withMessage('paymentType must be one of cash, transfer, credit'),
  body('note').optional().isString().withMessage('note must be a string')
])

const invoiceStatusValidation = validate([
  idParam('id'),
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .bail()
    .isIn(['draft', 'paid', 'cancelled'])
    .withMessage('status must be one of draft, paid, cancelled')
])

export {
  invoiceCreateValidation,
  invoiceIdValidation,
  invoiceListValidation,
  invoiceStatusValidation,
  invoiceUpdateValidation
}

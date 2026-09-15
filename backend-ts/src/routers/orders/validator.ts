import { idParam, paginationQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const orderListValidation = validate([...paginationQuery])

const orderIdValidation = validate([idParam('id'), vendorIdQuery('warehouseId')])

const orderCreateValidation = validate([
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt(),
  body('customerId').optional().isInt({ min: 1 }).withMessage('customerId must be a positive integer').toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt(),
  body('paymentType')
    .optional()
    .isIn(['cash', 'transfer', 'credit'])
    .withMessage('paymentType must be one of cash, transfer, credit'),
  body('channel').optional().isIn(['POS', 'WHOLESALE', 'ONLINE']).withMessage('channel must be POS, WHOLESALE or ONLINE'),
  body('orderDetails')
    .exists({ checkNull: true })
    .withMessage('orderDetails is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('orderDetails must be a non-empty array'),
  body('orderDetails.*.productId')
    .notEmpty()
    .withMessage('orderDetails[].productId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('orderDetails[].productId must be a positive integer')
    .toInt(),
  body('orderDetails.*.variantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('orderDetails[].variantId must be a positive integer')
    .toInt(),
  body('orderDetails.*.quantity')
    .notEmpty()
    .withMessage('orderDetails[].quantity is required')
    .bail()
    .isFloat({ min: 0.000001 })
    .withMessage('orderDetails[].quantity must be a number > 0')
    .toFloat(),
  body('orderDetails.*.price').optional().isFloat({ min: 0 }).withMessage('orderDetails[].price must be >= 0').toFloat(),
  body('orderDetails.*.buyPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('orderDetails[].buyPrice must be >= 0')
    .toFloat()
])

const orderUpdateValidation = validate([
  idParam('id'),
  body('paymentType')
    .optional()
    .isIn(['cash', 'transfer', 'credit'])
    .withMessage('paymentType must be one of cash, transfer, credit'),
  body('customerId').optional().isInt({ min: 1 }).withMessage('customerId must be a positive integer').toInt(),
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt()
])

const orderReturnValidation = validate([
  idParam('id'),
  body('items')
    .exists({ checkNull: true })
    .withMessage('items is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.productVariantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('items[].productVariantId must be a positive integer')
    .toInt(),
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('items[].quantity must be a number > 0')
    .toFloat(),
  body('reason').optional().isString().withMessage('reason must be a string'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('refundAmount must be a number >= 0').toFloat()
])

const orderInvoiceCreateValidation = validate([
  idParam('id'),
  body('lines')
    .exists({ checkNull: true })
    .withMessage('lines is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('lines must be a non-empty array'),
  body('lines.*.order_detail_id')
    .exists({ checkNull: true })
    .withMessage('lines[].order_detail_id is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('lines[].order_detail_id must be a positive integer')
    .toInt(),
  body('lines.*.quantity')
    .exists({ checkNull: true })
    .withMessage('lines[].quantity is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('lines[].quantity must be a positive integer')
    .toInt(),
  body('paymentType')
    .optional()
    .isIn(['cash', 'transfer', 'credit'])
    .withMessage('paymentType must be one of cash, transfer, credit'),
  body('notes').optional().isString().withMessage('notes must be a string'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be ISO8601 date')
])

export {
  orderCreateValidation,
  orderIdValidation,
  orderInvoiceCreateValidation,
  orderListValidation,
  orderReturnValidation,
  orderUpdateValidation
}

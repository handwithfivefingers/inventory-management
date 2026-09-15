import { idParam, paginationQuery, validate } from '#/middleware/validate'
import { body } from 'express-validator'

const importOrderListValidation = validate([...paginationQuery])

const importOrderIdValidation = validate([idParam('id')])

const importOrderCreateValidation = validate([
  body('providerId')
    .notEmpty()
    .withMessage('providerId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('providerId must be a positive integer')
    .toInt(),
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt(),
  body('note').optional().isString().withMessage('note must be a string'),
  body('items').optional().isArray().withMessage('items must be an array'),
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
  body('items.*.price').optional().isFloat({ min: 0 }).withMessage('items[].price must be a number >= 0').toFloat()
])

export { importOrderCreateValidation, importOrderIdValidation, importOrderListValidation }

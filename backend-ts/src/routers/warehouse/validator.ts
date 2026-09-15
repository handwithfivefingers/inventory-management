import { idParam, paginationQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const warehouseListValidation = validate([...paginationQuery, vendorIdQuery('vendorId')])

const warehouseIdValidation = validate([idParam('id'), vendorIdQuery('vendorId')])

const warehouseCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('address').optional().isString().withMessage('address must be a string'),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('isMain').optional().isBoolean().withMessage('isMain must be a boolean').toBoolean(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const warehouseUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').trim(),
  body('address').optional().isString().withMessage('address must be a string'),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('isMain').optional().isBoolean().withMessage('isMain must be a boolean').toBoolean()
])

const warehouseTransferValidation = validate([
  body('fromWarehouseId')
    .notEmpty()
    .withMessage('fromWarehouseId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('fromWarehouseId must be a positive integer')
    .toInt(),
  body('toWarehouseId')
    .notEmpty()
    .withMessage('toWarehouseId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('toWarehouseId must be a positive integer')
    .toInt(),
  body('note').optional().isString().withMessage('note must be a string'),
  body('items')
    .exists({ checkNull: true })
    .withMessage('items is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('items[].productId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('items[].productId must be a positive integer')
    .toInt(),
  body('items.*.variantId').optional().isInt({ min: 1 }).withMessage('items[].variantId must be a positive integer').toInt(),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('items[].quantity is required')
    .bail()
    .isFloat({ min: 0.000001 })
    .withMessage('items[].quantity must be a number > 0')
    .toFloat()
])

export {
  warehouseCreateValidation,
  warehouseIdValidation,
  warehouseListValidation,
  warehouseTransferValidation,
  warehouseUpdateValidation
}

import { idParam, validate } from '#/middleware/validate'
import { body } from 'express-validator'

const stocktakeIdValidation = validate([idParam('id')])

const stocktakeStartValidation = validate([
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('warehouseId must be a positive integer')
    .toInt(),
  body('note').optional().isString().withMessage('note must be a string')
])

const stocktakeLinesValidation = validate([
  idParam('id'),
  body('lines')
    .exists({ checkNull: true })
    .withMessage('lines is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('lines must be a non-empty array'),
  body('lines.*.productVariantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('lines[].productVariantId must be a positive integer')
    .toInt(),
  body('lines.*.countedQty')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('lines[].countedQty must be a number >= 0')
    .toFloat(),
  body('lines.*.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('lines[].quantity must be a number >= 0')
    .toFloat()
])

export { stocktakeIdValidation, stocktakeLinesValidation, stocktakeStartValidation }

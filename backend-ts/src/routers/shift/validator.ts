import { idParam, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const shiftIdValidation = validate([idParam('id')])

const shiftCurrentValidation = validate([vendorIdQuery('warehouseId')])

const shiftOpenValidation = validate([
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('warehouseId must be a positive integer')
    .toInt(),
  body('openingCash').optional().isFloat({ min: 0 }).withMessage('openingCash must be a number >= 0').toFloat(),
  body('note').optional().isString().withMessage('note must be a string')
])

const shiftCloseValidation = validate([
  idParam('id'),
  body('closingCash').optional().isFloat({ min: 0 }).withMessage('closingCash must be a number >= 0').toFloat(),
  body('note').optional().isString().withMessage('note must be a string')
])

export { shiftCloseValidation, shiftCurrentValidation, shiftIdValidation, shiftOpenValidation }

import { idParam, optionalIsoDateQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const voucherIdValidation = validate([idParam('id')])

const voucherReportValidation = validate([
  optionalIsoDateQuery('from'),
  optionalIsoDateQuery('to'),
  vendorIdQuery('warehouseId')
])

const voucherCreateValidation = validate([
  body('amount')
    .notEmpty()
    .withMessage('amount is required')
    .bail()
    .isFloat({ min: 0.000001 })
    .withMessage('amount must be a number > 0')
    .toFloat(),
  body('type').optional().isString().withMessage('type must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

export { voucherCreateValidation, voucherIdValidation, voucherReportValidation }

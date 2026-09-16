import { validate } from '#/middleware/validate'
import { body } from 'express-validator'

const settingUpdateValidation = validate([
  body('key').optional().isString().withMessage('key must be a string').trim(),
  body('value').optional().isString().withMessage('value must be a string')
])

const vendorSettingsUpdateValidation = validate([
  body('name')
    .optional()
    .isString()
    .withMessage('name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name must be a non-empty string'),
  body(['legalName', 'legal_name'])
    .optional({ nullable: true })
    .isString()
    .withMessage('legal_name must be a string'),
  body(['taxNumber', 'tax_number'])
    .optional({ nullable: true })
    .isString()
    .withMessage('tax_number must be a string'),
  body('address').optional({ nullable: true }).isString().withMessage('address must be a string'),
  body('email')
    .optional({ nullable: true })
    .isString()
    .withMessage('email must be a string')
    .bail()
    .custom((value) => {
      if (value == null || String(value).trim() === '') return true
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) throw new Error('email must be a valid email address')
      return true
    }),
  body('phone').optional({ nullable: true }).isString().withMessage('phone must be a string'),
  body(['invoiceSeriesPrefix', 'invoice_series_prefix'])
    .optional({ nullable: true })
    .isString()
    .withMessage('invoice_series_prefix must be a string')
    .bail()
    .custom((value) => {
      if (value == null || String(value).trim() === '') return true
      if (!/^[A-Za-z0-9-]{1,20}$/.test(String(value).trim())) {
        throw new Error('invoice_series_prefix may only contain letters, digits and dashes (max 20)')
      }
      return true
    })
])

export { settingUpdateValidation, vendorSettingsUpdateValidation }

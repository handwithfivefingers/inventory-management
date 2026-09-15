import { validate } from '#/middleware/validate'
import { body } from 'express-validator'

const vendorCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('address').optional().isString().withMessage('address must be a string')
])

export { vendorCreateValidation }

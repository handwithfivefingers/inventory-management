import { idParam, paginationQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const providerCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('address').optional().isString().withMessage('address must be a string'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const providerListValidation = validate([...paginationQuery, vendorIdQuery('vendorId')])

const providerIdValidation = validate([idParam('id')])

export { providerCreateValidation, providerIdValidation, providerListValidation }

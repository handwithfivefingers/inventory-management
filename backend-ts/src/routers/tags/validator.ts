import { idParam, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const tagListValidation = validate([vendorIdQuery('vendorId'), vendorIdQuery('vendor')])

const tagIdValidation = validate([idParam('id')])

const tagCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const tagUpdateValidation = validate([
  idParam('id'),
  body('id').optional().isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
  body('name').optional().isString().withMessage('name must be a string').trim()
])

export { tagCreateValidation, tagIdValidation, tagListValidation, tagUpdateValidation }

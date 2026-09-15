import { idParam, paginationQuery, validate } from '#/middleware/validate'
import { body, query } from 'express-validator'

const customerListValidation = validate([
  ...paginationQuery,
  query('search').optional().isString().withMessage('search must be a string')
])

const customerIdValidation = validate([idParam('id')])

const customerCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('address').optional().isString().withMessage('address must be a string'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const customerUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').trim(),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('address').optional().isString().withMessage('address must be a string')
])

export { customerCreateValidation, customerIdValidation, customerListValidation, customerUpdateValidation }

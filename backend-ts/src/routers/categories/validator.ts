import { idParam, paginationQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const categoryListValidation = validate([...paginationQuery, vendorIdQuery('vendorId')])

const categoryIdValidation = validate([idParam('id')])

const categoryCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('description').optional().isString().withMessage('description must be a string'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const categoryUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').trim(),
  body('description').optional().isString().withMessage('description must be a string')
])

export { categoryCreateValidation, categoryIdValidation, categoryListValidation, categoryUpdateValidation }

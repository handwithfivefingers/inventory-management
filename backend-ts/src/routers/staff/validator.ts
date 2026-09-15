import { idParam, paginationQuery, validate } from '#/middleware/validate'
import { body, query } from 'express-validator'

const staffListValidation = validate([...paginationQuery])

const staffIdValidation = validate([idParam('id')])

const staffCreateValidation = validate([
  query('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt(),
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('roleId').optional().isInt({ min: 1 }).withMessage('roleId must be a positive integer').toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const staffUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').trim(),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('roleId').optional().isInt({ min: 1 }).withMessage('roleId must be a positive integer').toInt()
])

export { staffCreateValidation, staffIdValidation, staffListValidation, staffUpdateValidation }

import { idParam, validate, vendorIdQuery } from '#/middleware/validate'
import { body } from 'express-validator'

const roleListValidation = validate([vendorIdQuery('vendorId')])

const roleIdValidation = validate([idParam('id')])

const roleCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('description').optional().isString().withMessage('description must be a string'),
  body('permissions').optional().isArray().withMessage('permissions must be an array'),
  body('permissions.*').optional().isString().withMessage('permissions[] must be strings'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const roleUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').trim(),
  body('description').optional().isString().withMessage('description must be a string'),
  body('permissions').optional().isArray().withMessage('permissions must be an array'),
  body('permissions.*').optional().isString().withMessage('permissions[] must be strings')
])

const roleAssignValidation = validate([
  body('userId')
    .notEmpty()
    .withMessage('userId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
    .toInt(),
  body('roleId')
    .notEmpty()
    .withMessage('roleId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('roleId must be a positive integer')
    .toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

export { roleAssignValidation, roleCreateValidation, roleIdValidation, roleListValidation, roleUpdateValidation }

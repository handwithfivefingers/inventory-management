import { validate } from '#/middleware/validate'
import { body } from 'express-validator'

const settingUpdateValidation = validate([
  body('key').optional().isString().withMessage('key must be a string').trim(),
  body('value').optional().isString().withMessage('value must be a string')
])

export { settingUpdateValidation }

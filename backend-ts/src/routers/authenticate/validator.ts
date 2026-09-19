import { validate } from '#/middleware/validate'
import { body } from 'express-validator'

const loginValidator = validate([
  body('email')
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .bail()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
])

const registerValidator = validate([
  body('name').optional().isString().withMessage('name must be a string').trim().notEmpty().withMessage('name must not be empty'),
  body('email')
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .bail()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters'),
  body('language').optional().isIn(['vi', 'en']).withMessage('language must be vi or en')
])

export { loginValidator, registerValidator }

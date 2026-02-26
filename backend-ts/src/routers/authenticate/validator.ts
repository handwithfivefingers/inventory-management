import { NextFunction, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'

const loginValidator = [
  body('email')
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
  (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req)
    if (result.isEmpty()) {
      return next()
    }
    return res.status(400).send({ errors: result.array() })
  }
]

export { loginValidator }

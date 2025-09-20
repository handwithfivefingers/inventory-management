// const { query, validationResult, body } = require('express-validator')

import { NextFunction, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'

const loginValidator = [
  body('email').notEmpty(),
  body('password').notEmpty(),
  (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req)
    if (result.isEmpty()) {
      return next()
    }
    return res.status(400).send({ errors: result.array() })
  }
]

export { loginValidator }

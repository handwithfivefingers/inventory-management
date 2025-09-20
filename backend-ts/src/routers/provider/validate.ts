import { IRequestHandler } from '#/types/common'
import { body, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'
const providerCreateValidation = [
  body('name').notEmpty(),
  (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req)
    if (result.isEmpty()) {
      return next()
    }
    res.status(400).send({ errors: result.array() })
    return
  }
]
export { providerCreateValidation }

import { NextFunction, Request, Response } from 'express'
import { ContextRunner, param, query, ValidationChain, validationResult } from 'express-validator'

/**
 * Runs a list of express-validator chains and returns 400 `{ errors }`
 * when any rule fails. Keeps the error shape already used by
 * `routers/authenticate/validator.ts` and `routers/provider/validate.ts`.
 */
const validate = (rules: (ValidationChain | ContextRunner)[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const rule of rules) {
      await rule.run(req)
    }
    const result = validationResult(req)
    if (result.isEmpty()) {
      return next()
    }
    return res.status(400).send({ errors: result.array() })
  }
}

/** `:id`-style integer route param, e.g. `idParam()` or `idParam('attributeId')`. */
const idParam = (name = 'id') =>
  param(name)
    .exists({ checkNull: true })
    .withMessage(`${name} is required`)
    .bail()
    .isInt({ min: 1 })
    .withMessage(`${name} must be a positive integer`)
    .toInt()

/** Shared `?limit=&offset=` pagination query validation (both optional). */
const paginationQuery: ValidationChain[] = [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be an integer 1-200').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be an integer >= 0').toInt()
]

/** Optional `?vendorId=` / `?warehouseId=` integer query filters used across modules. */
const vendorIdQuery = (field = 'vendorId') =>
  query(field).optional().isInt({ min: 1 }).withMessage(`${field} must be a positive integer`).toInt()

const optionalIsoDateQuery = (field: string) =>
  query(field).optional().isISO8601().withMessage(`${field} must be an ISO8601 date`)

export { idParam, optionalIsoDateQuery, paginationQuery, validate, vendorIdQuery }

import { optionalIsoDateQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { query } from 'express-validator'

const dashboardValidation = validate([
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be an integer 1-365').toInt(),
  optionalIsoDateQuery('from'),
  optionalIsoDateQuery('to'),
  query('groupBy').optional().isIn(['day', 'month']).withMessage('groupBy must be one of day, month'),
  vendorIdQuery('warehouseId'),
  query('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('lowStockThreshold must be an integer >= 0').toInt()
])

export { dashboardValidation }

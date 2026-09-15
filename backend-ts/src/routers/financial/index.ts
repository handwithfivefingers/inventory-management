import { FinancialController } from '#/controllers/financial'
import express from 'express'
import { voucherCreateValidation, voucherIdValidation, voucherReportValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Financial']
  // #swagger.summary = 'List financial records (legacy)'
  // #swagger.security = [{ "bearerAuth": [] }]
  new FinancialController().getVouchers
)
Router.get(
  '/report',
  voucherReportValidation as any,
  // #swagger.tags = ['Financial']
  // #swagger.summary = 'Get financial report'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['from'] = { in: 'query', type: 'string', description: 'ISO date from' } */
  /* #swagger.parameters['to'] = { in: 'query', type: 'string', description: 'ISO date to' } */
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'string' } */
  new FinancialController().getReport
)
Router.get(
  '/:id',
  voucherIdValidation as any,
  // #swagger.tags = ['Financial']
  // #swagger.summary = 'Get voucher by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new FinancialController().getVoucherById
)
Router.post(
  '/',
  voucherCreateValidation as any,
  // #swagger.tags = ['Financial']
  // #swagger.summary = 'Create financial voucher'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/FinancialVoucherBody' } } */
  new FinancialController().createVoucher
)

export default Router

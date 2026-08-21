import { FinancialController } from '#/controllers/financial'
import express from 'express'
const Router = express.Router()

Router.get('/', new FinancialController().getVouchers)
Router.get('/report', new FinancialController().getReport)
Router.get('/:id', new FinancialController().getVoucherById)
Router.post('/', new FinancialController().createVoucher)

export default Router

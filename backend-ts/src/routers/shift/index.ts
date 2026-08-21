import ShiftController from '#/controllers/shift'
import express from 'express'
const Router = express.Router()

Router.get('/', new ShiftController().get)
Router.get('/current', new ShiftController().getCurrent)
Router.get('/:id', new ShiftController().getById)
Router.post('/open', new ShiftController().open)
Router.post('/:id/close', new ShiftController().close)

export default Router

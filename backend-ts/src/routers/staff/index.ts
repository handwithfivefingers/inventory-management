import StaffController from '#/controllers/staff'
import express from 'express'
const Router = express.Router()

Router.get('/', new StaffController().get)
Router.get('/:id', new StaffController().getById)
Router.post('/', new StaffController().create)
Router.put('/:id', new StaffController().update)
Router.delete('/:id', new StaffController().remove)

export default Router

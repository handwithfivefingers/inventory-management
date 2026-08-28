import { RoleController } from '#/controllers/role'
import express from 'express'
const Router = express.Router()

// Public routes (with auth)
// @ts-ignore
Router.get('/', new RoleController().get)
// @ts-ignore
Router.get('/:id', new RoleController().getById)
// @ts-ignore
Router.post('/create', new RoleController().create)
// @ts-ignore
Router.put('/:id', new RoleController().update)
// @ts-ignore
Router.delete('/:id', new RoleController().delete)
// Role assignment
// @ts-ignore
Router.post('/assign', new RoleController().assignToUser)
export default Router

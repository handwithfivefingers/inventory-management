import { RoleController } from '#/controllers/role'
import express from 'express'
import { roleAssignValidation, roleCreateValidation, roleIdValidation, roleListValidation, roleUpdateValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  roleListValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'List roles'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  // @ts-ignore
  new RoleController().get
)
Router.get(
  '/:id',
  roleIdValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'Get role by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  // @ts-ignore
  new RoleController().getById
)
Router.post(
  '/create',
  roleCreateValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'Create role'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/RoleBody' } } */
  // @ts-ignore
  new RoleController().create
)
Router.put(
  '/:id',
  roleUpdateValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'Update role'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/RoleBody' } } */
  // @ts-ignore
  new RoleController().update
)
Router.delete(
  '/:id',
  roleIdValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'Delete role'
  // #swagger.security = [{ "bearerAuth": [] }]
  // @ts-ignore
  new RoleController().delete
)
Router.post(
  '/assign',
  roleAssignValidation as any,
  // #swagger.tags = ['Roles']
  // #swagger.summary = 'Assign role to user'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { userId: { type: 'integer' }, roleId: { type: 'integer' } }, required: ['userId','roleId'] } } */
  // @ts-ignore
  new RoleController().assignToUser
)
export default Router

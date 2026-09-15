import StaffController from '#/controllers/staff'
import express from 'express'
import { staffCreateValidation, staffIdValidation, staffListValidation, staffUpdateValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  staffListValidation as any,
  // #swagger.tags = ['Staff']
  // #swagger.summary = 'List staff'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  new StaffController().get
)
Router.get(
  '/:id',
  staffIdValidation as any,
  // #swagger.tags = ['Staff']
  // #swagger.summary = 'Get staff by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StaffController().getById
)
Router.post(
  '/',
  staffCreateValidation as any,
  // #swagger.tags = ['Staff']
  // #swagger.summary = 'Create staff'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'string' } */
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string' }, email: { type: 'string' }, roleId: { type: 'integer' } }, required: ['name'] } } */
  new StaffController().create
)
Router.put(
  '/:id',
  staffUpdateValidation as any,
  // #swagger.tags = ['Staff']
  // #swagger.summary = 'Update staff'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string' }, email: { type: 'string' } } } } */
  new StaffController().update
)
Router.delete(
  '/:id',
  staffIdValidation as any,
  // #swagger.tags = ['Staff']
  // #swagger.summary = 'Delete staff'
  // #swagger.security = [{ "bearerAuth": [] }]
  new StaffController().remove
)

export default Router

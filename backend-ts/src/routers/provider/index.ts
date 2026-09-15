import { ProviderController } from '#/controllers/provider'
import { providerCreateValidation, providerIdValidation, providerListValidation } from './validate'
import express from 'express'
const Router = express.Router()

Router.get(
  '/',
  providerListValidation as any,
  // #swagger.tags = ['Providers']
  // #swagger.summary = 'List providers'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Page size (default 10)' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  new ProviderController().getProvider
)
Router.get(
  '/:id',
  providerIdValidation as any,
  // #swagger.tags = ['Providers']
  // #swagger.summary = 'Get provider by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProviderController().getId
)
Router.post(
  '/',
  providerCreateValidation,
  // #swagger.tags = ['Providers']
  // #swagger.summary = 'Create provider'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ProviderBody' } } */
  new ProviderController().create
)
export default Router

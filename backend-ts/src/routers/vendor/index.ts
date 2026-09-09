import VendorController from '#/controllers/vendor'
import express from 'express'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Vendors']
  // #swagger.summary = 'List vendors by current user'
  // #swagger.security = [{ "bearerAuth": [] }]
  new VendorController().getVendorByUserId
)
Router.post(
  '/',
  // #swagger.tags = ['Vendors']
  // #swagger.summary = 'Create a new vendor'
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/VendorBody' } } */
  // #swagger.security = [{ "bearerAuth": [] }]
  new VendorController().create
)

export default Router

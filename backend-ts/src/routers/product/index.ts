import { ProductController } from '#/controllers/product'
import { ProductAttributeController } from '#/controllers/product/productAttribute'
import express from 'express'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'List products'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['limit'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['offset'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['search'] = { in: 'query', type: 'string' } */
  new ProductController().getProducts
)
Router.post(
  '/',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Create product'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ProductBody' } } */
  new ProductController().create
)
// NOTE: must be registered before '/:id' so "attributes" is not captured as an id
Router.get(
  '/attributes',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'List product attributes'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().list
)
Router.post(
  '/attributes',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Create product attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string', example: 'Color' }, type: { type: 'string', example: 'select' } }, required: ['name'] } } */
  new ProductAttributeController().create
)
Router.get(
  '/attributes/:attributeId',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Get attribute by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().getById
)
Router.put(
  '/attributes/:attributeId',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Update attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string' } } } } */
  new ProductAttributeController().update
)
Router.delete(
  '/attributes/:attributeId',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Delete attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().delete
)
Router.get(
  '/attributes/:attributeId/values',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'List values of an attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().listValues
)
Router.post(
  '/attributes/:attributeId/values',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Create attribute values'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { values: { type: 'array', items: { type: 'string' }, example: ['Red','Blue'] } } } } */
  new ProductAttributeController().createValues
)
Router.put(
  '/attributes/values/:valueId',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Update attribute value'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { value: { type: 'string', example: 'Red' } } } } */
  new ProductAttributeController().updateValue
)
Router.delete(
  '/attributes/values/:valueId',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Delete attribute value'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().deleteValue
)
Router.get(
  '/attributes/:attributeId/products',
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'List products by attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().listProducts
)

Router.get(
  '/:id',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Get product by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().getProductById
)
Router.get(
  '/:id/variants',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'List variants of a product'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().getProductVariants
)
Router.put(
  '/:id/variants/sync',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Sync variants for a product'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { variants: { type: 'array', items: { type: 'object' } } } } } */
  new ProductController().syncProductVariants
)
Router.put(
  '/:id/variants/:variantId',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Update a product variant'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { price: { type: 'number' }, sku: { type: 'string' }, stock: { type: 'integer' } } } } */
  new ProductController().updateVariant
)
Router.delete(
  '/:id/variants/:variantId',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Delete a product variant'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().deleteVariant
)

export default Router

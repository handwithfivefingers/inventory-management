import { ProductController, productImportUpload } from '#/controllers/product'
import { ProductAttributeController } from '#/controllers/product/productAttribute'
import express from 'express'
import {
  attributeCreateValidation,
  attributeIdValidation,
  attributeUpdateValidation,
  attributeValueIdValidation,
  attributeValuesCreateValidation,
  attributeValueUpdateValidation,
  productCreateValidation,
  productExportValidation,
  productIdValidation,
  productImportValidation,
  productListValidation,
  productSearchValidation,
  productUpdateValidation,
  productVariantIdValidation
} from './validator'
const Router = express.Router()

// NOTE: export/import must be registered before '/:id' so they are not captured as ids
Router.get(
  '/export',
  productExportValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Export products as xlsx'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['vendorId'] = { in: 'query', type: 'integer' } */
  /* #swagger.parameters['s'] = { in: 'query', type: 'string' } */
  new ProductController().exportExcel
)
Router.get(
  '/import/template',
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Download product import template (xlsx)'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().importTemplate
)
Router.post(
  '/import',
  productImportUpload as any,
  productImportValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Import products from xlsx/csv (create + update by skuCode)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['file'] = { in: 'formData', type: 'file', required: true } */
  /* #swagger.parameters['warehouseId'] = { in: 'query', type: 'integer', required: true } */
  new ProductController().importExcel
)

Router.get(
  '/',
  productListValidation as any,
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
  productCreateValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Create product'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ProductBody' } } */
  new ProductController().create as any
)
// NOTE: must be registered before '/:id' so "search" is not captured as an id
Router.post(
  '/search',
  productSearchValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Unified product query for POS/Sell and Admin (exact scan match + context fallback)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { query: { type: 'string' }, context: { type: 'string', enum: ['POS', 'ADMIN'] }, warehouse_id: { type: 'integer' }, page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 20 } }, required: ['context'] } } */
  new ProductController().search
)
Router.post('/stock/by-barcode', new ProductController().adjustStockByBarcode as any)
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
  attributeCreateValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Create product attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string', example: 'Color' }, type: { type: 'string', example: 'select' } }, required: ['name'] } } */
  new ProductAttributeController().create
)
Router.get(
  '/attributes/:attributeId',
  attributeIdValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Get attribute by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().getById
)
Router.put(
  '/attributes/:attributeId',
  attributeUpdateValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Update attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { name: { type: 'string' } } } } */
  new ProductAttributeController().update
)
Router.delete(
  '/attributes/:attributeId',
  attributeIdValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Delete attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().delete
)
Router.get(
  '/attributes/:attributeId/values',
  attributeIdValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'List values of an attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().listValues
)
Router.post(
  '/attributes/:attributeId/values',
  attributeValuesCreateValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Create attribute values'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { values: { type: 'array', items: { type: 'string' }, example: ['Red','Blue'] } } } } */
  new ProductAttributeController().createValues
)
Router.put(
  '/attributes/values/:valueId',
  attributeValueUpdateValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Update attribute value'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { value: { type: 'string', example: 'Red' } } } } */
  new ProductAttributeController().updateValue
)
Router.delete(
  '/attributes/values/:valueId',
  attributeValueIdValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'Delete attribute value'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().deleteValue
)
Router.get(
  '/attributes/:attributeId/products',
  attributeIdValidation as any,
  // #swagger.tags = ['ProductAttributes']
  // #swagger.summary = 'List products by attribute'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductAttributeController().listProducts
)

Router.get(
  '/:id/full',
  productIdValidation as any,
  new ProductController().getProductFull
)
Router.get(
  '/:id',
  productIdValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Get product by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().getProductById
)
Router.get(
  '/:id/variants',
  productIdValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'List variants of a product'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().getProductVariants
)
Router.get(
  '/:id/barcodes',
  productIdValidation as any,
  // #swagger.tags = ['ProductBarcodes']
  // #swagger.summary = 'List barcode selling units for a product'
  new ProductController().getProductBarcodes
)

Router.put(
  '/:id',
  productUpdateValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Update a product (simple + variant unified; variants carry their own barcode)'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().updateProduct as any
)

Router.delete(
  '/:id/variants/:variantId',
  productVariantIdValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Soft-delete a single variant (paranoid; keeps orders/stock history)'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().deleteVariant
)

Router.delete(
  '/:id',
  productIdValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Soft-delete a product + its variants (paranoid; keeps orders/stock/finance)'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().deleteProduct
)

Router.post(
  '/:id/restore',
  productIdValidation as any,
  // #swagger.tags = ['Products']
  // #swagger.summary = 'Restore a soft-deleted product + its variants'
  // #swagger.security = [{ "bearerAuth": [] }]
  new ProductController().restoreProduct
)

export default Router

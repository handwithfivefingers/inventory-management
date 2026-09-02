import { ProductController } from '#/controllers/product'
import { ProductAttributeController } from '#/controllers/product/productAttribute'
import express from 'express'
const Router = express.Router()

Router.get('/', new ProductController().getProducts)
Router.post('/', new ProductController().create)
// NOTE: must be registered before '/:id' so "attributes" is not captured as an id
// Vendor-global attributes (new schema: vendorId, not productId)
Router.get('/attributes', new ProductAttributeController().list)
Router.post('/attributes', new ProductAttributeController().create)
Router.get('/attributes/:attributeId', new ProductAttributeController().getById)
Router.put('/attributes/:attributeId', new ProductAttributeController().update)
Router.delete('/attributes/:attributeId', new ProductAttributeController().delete)
Router.get('/attributes/:attributeId/values', new ProductAttributeController().listValues)
Router.post('/attributes/:attributeId/values', new ProductAttributeController().createValues)
Router.put('/attributes/values/:valueId', new ProductAttributeController().updateValue)
Router.delete('/attributes/values/:valueId', new ProductAttributeController().deleteValue)
Router.get('/attributes/:attributeId/products', new ProductAttributeController().listProducts)

Router.get('/:id', new ProductController().getProductById)
Router.get('/:id/variants', new ProductController().getProductVariants)
// NOTE: registered before '/:id/variants/:variantId' so "sync" is not taken for an id
Router.put('/:id/variants/sync', new ProductController().syncProductVariants)
Router.put('/:id/variants/:variantId', new ProductController().updateVariant)
Router.delete('/:id/variants/:variantId', new ProductController().deleteVariant)

export default Router

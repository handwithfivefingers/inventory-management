import { ProductController } from '#/controllers/product'
import express from 'express'
const Router = express.Router()

Router.get('/', new ProductController().getProducts)
Router.post('/', new ProductController().create)
// NOTE: must be registered before '/:id' so "attributes" is not captured as an id
Router.get('/attributes', new ProductController().listAttributes)
Router.get('/:id', new ProductController().getProductById)
Router.get('/:id/variants', new ProductController().getProductVariants)
// NOTE: registered before '/:id/variants/:variantId' so "sync" is not taken for an id
Router.put('/:id/variants/sync', new ProductController().syncProductVariants)
Router.put('/:id/variants/:variantId', new ProductController().updateVariant)
Router.delete('/:id/variants/:variantId', new ProductController().deleteVariant)
Router.get('/:id/attributes', new ProductController().getProductAttributes)
Router.post('/:id/attributes', new ProductController().createAttribute)
Router.put('/:id/attributes/:attributeId', new ProductController().updateAttribute)
Router.delete('/:id/attributes/:attributeId', new ProductController().deleteAttribute)

export default Router

// const express = require('express')
// const route = express.Router()
// const { ProductController } = require('../controllers')
// const productValidation = require('@validator/product')
// const { uploadFiles } = require('@middleware/upload')

// const { auth, authUpload } = require('@src/middleware/authenticate')
// const { userInfoMiddleware } = require('@src/middleware/userInformation')

// route.post(
//   '/import',
//   authUpload,
//   userInfoMiddleware,
//   uploadFiles.single('products'),
//   new ProductController().importProduct
// )
// route.post('', auth, userInfoMiddleware, ...productValidation, new ProductController().create)
// route.get('', auth, userInfoMiddleware, new ProductController().getProduct)
// route.get('/:id', auth, userInfoMiddleware, new ProductController().getProductById)
// route.post('/:id', auth, userInfoMiddleware, new ProductController().updateProduct)

// module.exports = route

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

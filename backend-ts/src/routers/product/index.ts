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
import Router from '#/core/router'

// Router.get('/', new VendorController().get)
Router.get('/', new ProductController().getProducts)
Router.get('/:id', new ProductController().getProductById)

const ProductRouter = Router

export default ProductRouter

// const express = require('express')
// const { CategoriesController } = require('../controllers')
// const route = express.Router()

import { CategoriesController } from '#/controllers/categories'
import express from 'express'
const route = express.Router()

route.get('/', new CategoriesController().get)

route.get('/:id', new CategoriesController().getById)

route.post('/', new CategoriesController().create)

route.post('/:id', new CategoriesController().update)

route.delete('/:id', new CategoriesController().delete)

export default route

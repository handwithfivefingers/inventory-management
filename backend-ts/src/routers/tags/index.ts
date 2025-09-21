// const express = require("express");
// const { TagsController } = require("../controllers");
// const route = express.Router();

// route.get("/", new TagsController().get);

// route.get("/:id", new TagsController().getById);

// route.post("/", new TagsController().create);

// route.post("/:id", new TagsController().update);

// module.exports = route;

import { TagsController } from '#/controllers/tags'
import express from 'express'
const route = express.Router()

route.get('/', new TagsController().get)

route.get('/:id', new TagsController().getById)

route.post('/', new TagsController().create)

route.post('/:id', new TagsController().update)

export default route

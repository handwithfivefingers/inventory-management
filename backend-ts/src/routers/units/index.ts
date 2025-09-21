// const express = require("express");
// const { UnitsController } = require("../controllers");
// const route = express.Router();

// route.get("/", new UnitsController().get);

// route.get("/:id", new UnitsController().getById);

// route.post("/", new UnitsController().create);

// route.post("/:id", new UnitsController().update);

// module.exports = route;

import { UnitsController } from '#/controllers/units'
import express from 'express'
const route = express.Router()

route.get('/', new UnitsController().get)

route.get('/:id', new UnitsController().getById)

route.post('/', new UnitsController().create)

route.post('/:id', new UnitsController().update)

export default route
const express = require("express");
const { CategoriesController } = require("../controllers");
const route = express.Router();

route.get("/", new CategoriesController().get);

route.get("/:id", new CategoriesController().getById);

route.post("/", new CategoriesController().create);

route.post("/:id", new CategoriesController().update);

module.exports = route;

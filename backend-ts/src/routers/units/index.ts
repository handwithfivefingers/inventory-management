const express = require("express");
const { UnitsController } = require("../controllers");
const route = express.Router();

route.get("/", new UnitsController().get);

route.get("/:id", new UnitsController().getById);

route.post("/", new UnitsController().create);

route.post("/:id", new UnitsController().update);

module.exports = route;

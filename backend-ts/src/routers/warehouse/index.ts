const express = require("express");
const route = express.Router();
const { WarehouseController } = require("../controllers");

route.get("/", new WarehouseController().get);
route.get("/:id", new WarehouseController().getWarehouseById);
route.post("/create", new WarehouseController().create);
route.post("/active", new WarehouseController().activeWarehouse);

module.exports = route;

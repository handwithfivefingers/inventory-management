const express = require("express");
const route = express.Router();
const { ImportOrderController } = require("../controllers");
const importOrderValidation = require("@src/validator/importOrder");

route.get("/", importOrderValidation, new ImportOrderController().getOrders);

route.get("/:id", new ImportOrderController().getOrderById);

route.post("/", new ImportOrderController().create);

module.exports = route;

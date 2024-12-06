const express = require("express");
const route = express.Router();
const { OrderController } = require("../controllers");

route.get("/", new OrderController().getOrders);

route.get("/:id", new OrderController().getOrderById);

route.post("/create", new OrderController().create);

module.exports = route;

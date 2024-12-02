const express = require("express");
const route = express.Router();
const { ProductController } = require("../controllers");
const { create, getProduct } = new ProductController();
route.post("", create);
route.get("", getProduct);

module.exports = route;

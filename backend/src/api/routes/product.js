const express = require("express");
const route = express.Router();
const { ProductController } = require("../controllers");
const { create, getProduct, getProductById } = new ProductController();
const productValidation = require("@validator/product");


route.post("", ...productValidation, create);
route.get("", getProduct);
route.get("/:id", getProductById);

module.exports = route;

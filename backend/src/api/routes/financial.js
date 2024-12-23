const express = require("express");
const route = express.Router();
const { FinancialController } = require("../controllers");
route.get("/", new FinancialController().get);
module.exports = route;

const express = require("express");
const route = express.Router();
const { VendorController } = require("../controllers");

route.get("/", new VendorController().get);
route.post("/create", new VendorController().create);

module.exports = route;

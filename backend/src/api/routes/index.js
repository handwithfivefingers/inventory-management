const express = require("express");
const route = express.Router();



route.use("/", require("./authenticate"));


route.use("/products", require("./product"));

module.exports = route;

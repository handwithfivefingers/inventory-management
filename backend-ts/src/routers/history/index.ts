const express = require("express");
const { HistoryController } = require("../controllers");
const route = express.Router();

route.get("/:id", new HistoryController().getHistoryByProductId);

module.exports = route;

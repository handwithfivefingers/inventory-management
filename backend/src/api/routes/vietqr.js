const express = require("express");
const VIETQRController = require("../controllers/vietqr");
const route = express.Router();

route.get("/", new VIETQRController().generate);

module.exports = route;

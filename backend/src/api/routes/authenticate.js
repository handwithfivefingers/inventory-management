const express = require("express");
const route = express.Router();
const { AuthenticateController } = require("../controllers");

route.post("/register", new AuthenticateController().register);

module.exports = route;

const express = require("express");
const route = express.Router();
const { RoleController } = require("../controllers");

route.get("/", new RoleController().get);
route.post("/create", new RoleController().create);

module.exports = route;

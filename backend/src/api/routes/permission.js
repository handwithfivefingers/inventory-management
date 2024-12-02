const express = require("express");
const route = express.Router();
const { PermissionController } = require("../controllers");

route.get("/", new PermissionController().get);
route.post("/create", new PermissionController().create);

module.exports = route;

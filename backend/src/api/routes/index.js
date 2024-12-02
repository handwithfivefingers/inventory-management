const { auth } = require("@src/middleware/authenticate");
const express = require("express");
const route = express.Router();

route.use("/auth", require("./authenticate"));
route.use("/permission", require("./permission"));
route.use("/role", require("./role"));
route.use("/products", auth, require("./product"));
route.use("/vendors", auth, require("./vendor"));
route.use("/warehouses", auth, require("./warehouse"));

module.exports = route;

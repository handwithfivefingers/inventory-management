const { auth } = require("@src/middleware/authenticate");
const { userInfoMiddleware } = require("@src/middleware/userInformation");
const express = require("express");
const route = express.Router();

route.use("/auth", require("./authenticate"));

route.use("/permission", require("./permission"));

route.use("/role", require("./role"));

route.use("/products", require("./product"));

route.use("/vendors", auth, require("./vendor"));

route.use("/warehouses", auth, require("./warehouse"));

route.use("/providers", auth, require("./provider"));

route.use("/orders", auth, require("./orders"));

route.use("/import-order", auth, require("./importOrder"));

route.use("/categories", auth, require("./categories"));

route.use("/tags", auth, require("./tags"));

route.use("/units", auth, require("./units"));

route.use("/financial", auth, require("./financial"));

route.use("/history", auth, require("./history"));

route.use("/qr", require("./vietqr"));

module.exports = route;

const express = require("express");
const { auth } = require("@middleware/authenticate");
const route = express.Router();
const { AuthenticateController } = require("../controllers");

route.post("/login", new AuthenticateController().login);
route.get("/me", auth, new AuthenticateController().get);
route.post("/register", new AuthenticateController().register);

module.exports = route;

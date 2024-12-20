const express = require("express");
const route = express.Router();
const { ProviderController } = require("../controllers");
const providerValidation = require("@src/validator/provider");

route.get("/", providerValidation, new ProviderController().getProvider);
route.get("/:id", new ProviderController().getId);
route.post("/", new ProviderController().create);
route.post("/:id", new ProviderController().update);

module.exports = route;

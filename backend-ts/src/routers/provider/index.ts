const express = require("express");
const route = express.Router();
const { ProviderController } = require("../controllers");
const { providerValidation, providerCreateValidation } = require("@src/validator/provider");

route.get("/", new ProviderController().getProvider);
route.get("/:id", new ProviderController().getId);
route.post("/", providerCreateValidation, new ProviderController().create);
route.post("/:id", new ProviderController().update);

module.exports = route;

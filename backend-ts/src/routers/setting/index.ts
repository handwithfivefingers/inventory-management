const express = require("express");
const route = express.Router();
const { SettingController } = require("../controllers");

route.post("/", new SettingController().createSetting);
route.post("/:id", new SettingController().updateSetting);
route.get("/:id", new SettingController().getSetting);

module.exports = route;

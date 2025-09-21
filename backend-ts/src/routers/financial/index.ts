// const express = require("express");
// const route = express.Router();
// const { FinancialController } = require("../controllers");
// route.get("/", new FinancialController().get);
// module.exports = route;

import { FinancialController } from '#/controllers/financial'
import express from 'express'
const Router = express.Router()
Router.get('/', new FinancialController().get)
export default Router

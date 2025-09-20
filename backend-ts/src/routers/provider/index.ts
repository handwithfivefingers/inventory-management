// const express = require("express");
// const route = express.Router();
// const { ProviderController } = require("../controllers");
// const { providerValidation, providerCreateValidation } = require("@src/validator/provider");
import { ProviderController } from '#/controllers/provider'
import { providerCreateValidation } from './validate'
import express from 'express'
const Router = express.Router()
Router.get('/', new ProviderController().getProvider)
Router.get('/:id', new ProviderController().getId)
Router.post('/', providerCreateValidation, new ProviderController().create)
// Router.post('/:id', new ProviderController().update)
export default Router

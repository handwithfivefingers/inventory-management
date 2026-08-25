import { SettingController } from '#/controllers/setting'
import express from 'express'
const Router = express.Router()

// @ts-ignore
Router.get('/', new SettingController().get)
// @ts-ignore
Router.put('/', new SettingController().update)

export default Router

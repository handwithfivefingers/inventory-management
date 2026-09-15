import { SettingController } from '#/controllers/setting'
import express from 'express'
import { settingUpdateValidation } from './validator'
const Router = express.Router()

Router.get(
  '/',
  // #swagger.tags = ['Settings']
  // #swagger.summary = 'Get settings'
  // #swagger.security = [{ "bearerAuth": [] }]
  // @ts-ignore
  new SettingController().get
)
Router.put(
  '/',
  settingUpdateValidation as any,
  // #swagger.tags = ['Settings']
  // #swagger.summary = 'Update settings'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { key: { type: 'string' }, value: { type: 'string' } } } } */
  // @ts-ignore
  new SettingController().update
)

export default Router

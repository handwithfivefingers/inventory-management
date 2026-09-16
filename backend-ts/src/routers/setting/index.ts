import { SettingController } from '#/controllers/setting'
import { idParam } from '#/middleware/validate'
import express from 'express'
import { settingUpdateValidation, vendorSettingsUpdateValidation } from './validator'
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

// ---------------------------------------------------------------------------
// Vendor Settings section (vendor master-data).
//
// Authorization: mounted under `/settings` (auth -> vendorGuard ->
// authorize('setting')), so PUT/PATCH here require the `U` action - i.e.
// the Owner (`admin` role bypass) or `setting:U` (manage_vendor_settings).
//
// Tenant isolation: writes are scoped to the ACTIVE workspace vendor
// (`req.user.vendorId`). A cross-vendor id is rejected with 403 even when
// the caller owns several vendors. Because the global `vendorGuard`
// requires an explicit vendor scope, clients must send the target id as
// `?vendorId=` (or `vendorId` in the body) matching the path `:id`.
//
// Snapshot guardrail: updates only touch `vendors` (+ `vendor_histories`
// audit). Issued invoices keep their at-issue snapshot and are immutable.
// ---------------------------------------------------------------------------
Router.get(
  '/vendor',
  // #swagger.tags = ['Settings']
  // #swagger.summary = 'Get vendor settings (master data)'
  // #swagger.security = [{ "bearerAuth": [] }]
  // @ts-ignore
  new SettingController().getVendor
)
Router.put(
  '/vendor',
  vendorSettingsUpdateValidation as any,
  // #swagger.tags = ['Settings']
  // #swagger.summary = 'Update vendor settings (active workspace vendor)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { vendorId: { type: 'integer' }, name: { type: 'string' }, legal_name: { type: 'string' }, tax_number: { type: 'string' }, address: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, invoice_series_prefix: { type: 'string' } } } } */
  // @ts-ignore
  new SettingController().updateVendor
)
Router.patch(
  '/vendor/:id',
  idParam('id') as any,
  vendorSettingsUpdateValidation as any,
  // #swagger.tags = ['Settings']
  // #swagger.summary = 'Update vendor settings by id (must match the active workspace vendor)'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = { in: 'body', required: true, schema: { properties: { vendorId: { type: 'integer' }, name: { type: 'string' }, legal_name: { type: 'string' }, tax_number: { type: 'string' }, address: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, invoice_series_prefix: { type: 'string' } } } } */
  // @ts-ignore
  new SettingController().updateVendor
)

export default Router

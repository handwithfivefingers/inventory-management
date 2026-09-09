import PermissionController from '#/controllers/permission'
import express from 'express'

const router = express.Router()
router.get(
  '/',
  // #swagger.tags = ['Permissions']
  // #swagger.summary = 'Get permission catalog'
  // #swagger.security = [{ "bearerAuth": [] }]
  new PermissionController().get as any
)

export default router

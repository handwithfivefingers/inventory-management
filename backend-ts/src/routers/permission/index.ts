import PermissionController from '#/controllers/permission'
import express from 'express'

const router = express.Router()
router.get('/', new PermissionController().get as any)

export default router

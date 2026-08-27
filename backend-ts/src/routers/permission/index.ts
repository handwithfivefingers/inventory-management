import { MODULES, PERMISSION_ACTIONS } from '#/constant/modules'
import database from '#/database'
import authorize from '#/middleware/authorize'
import PermissionSyncService from '#/services/permissionSync'
import express, { NextFunction, Request, Response } from 'express'

const Router = express.Router()

/**
 * GET /api/permissions
 * Returns the canonical module catalog (with the 4 actions) plus every
 * permission row currently stored. Role editors consume this so their UI can
 * never drift from what the backend actually enforces.
 */
Router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await database.permission.findAll({ order: [['name', 'ASC']] })
      res.status(200).json({
        data: {
          modules: MODULES,
          actions: PERMISSION_ACTIONS,
          permissions: rows
        }
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/permissions/sync
 * Back-fills any missing canonical permissions onto Admin roles (idempotent).
 * Normally runs automatically at boot; exposed for manual triggering after
 * deployments that introduce new modules.
 */
Router.post(
  '/sync',
  // Guarded: re-syncing the catalog is a role-management operation.
  authorize('role'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await new PermissionSyncService().sync()
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }
)

export default Router

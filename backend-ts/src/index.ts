import SentryInstance from '#/configs/sentry'
import appRouter from '#/routers'
import { captureException, setupExpressErrorHandler } from '@sentry/node'
import parser from 'cookie-parser'
import express, { Express, NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import Redis from './configs/redis'
import database from './database'
import cors from 'cors'
import PermissionSyncService from '#/services/permissionSync'

const port = process.env.PORT ?? 3000
class App {
  app: Express
  constructor() {
    const app = express()
    app.use(
      express.json({
        limit: '5mb'
      })
    )

    app.use(parser())
    app.use(morgan('dev'))
    app.use(helmet())
    app.use(
      cors({
        // SECURITY: allowed origins come from CORS_ORIGINS (comma-separated);
        // the localhost defaults only exist for local development.
        origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      })
    )
    app.use('/api', appRouter)
    setupExpressErrorHandler(app)

    this.app = app

    this.debugSentry()
  }
  start() {
    this.app.listen(port, () => {
      Redis.sync()
      new SentryInstance().profiler.startProfiler()
      database
        .load()
        .then(async () => {
          // CRITICAL ORDER: the one-time hybrid data migration (flags moved
          // from `permissions` onto `role_permissions`) must run BEFORE
          // sync({alter:true}), which would otherwise drop the legacy
          // columns - and the grants inside them.
          await new PermissionSyncService().migrateLegacyIfNeeded()
        })
        .then(() => database.sync())
        .then(async () => {
          // Ensure the catalog matches the module registry and Admin roles
          // keep full access to any newly introduced modules.
          const result = await new PermissionSyncService().sync()
          if (result.createdPermissions || result.linkedAdminPermissions) {
            console.log('permission sync:', result)
          }
        })
        .catch((error: unknown) => {
          console.error('database Sync error:', error)
        })
      console.log(`Example app listening on port ${port}`)
    })
  }

  debugSentry() {
    const errorHandler = (err: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(err)
      }
      captureException(err)
      // SECURITY: 5xx responses must not leak internals (stack, SQL, ...).
      // Client errors keep their message; server failures return a generic
      // body and default to 500 so monitoring sees real fault rates.
      const status = err?.status && Number.isFinite(err.status) ? err.status : 500
      const isClientError = status >= 400 && status < 500
      return res.status(status).json({
        error: isClientError ? err.message : 'Internal Server Error'
      })
    }
    this.app.use(errorHandler as any)
    if (process.env.NODE_ENV !== 'production') {
      this.app.get('/debug-sentry', function mainHandler(req, res) {
        throw new Error('My first Sentry error!')
      })
    }
  }
}

new App().start()

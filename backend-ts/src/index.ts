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
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'
import { handleErrors } from '#/response'

const swaggerDocument = JSON.parse(fs.readFileSync('./swagger-output.json', 'utf8'))

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
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
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
        .then(() => database.sync())
        .catch((error: unknown) => {
          console.error('database Sync error:', error)
        })
      console.log(`Example app listening on port ${port}`)
    })
  }

  debugSentry() {
    this.app.use(handleErrors as any)
    if (process.env.NODE_ENV !== 'production') {
      this.app.get('/debug-sentry', function mainHandler(req, res) {
        throw new Error('My first Sentry error!')
      })
    }
  }
}

new App().start()

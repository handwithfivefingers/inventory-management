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
        origin: ['http://localhost:3000', 'localhost:5173', 'localhost:3001'],
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
        .then(() => database.sync())
        .catch((error: unknown) => {
          console.error('database Sync error:', error)
        })
      console.log(`Example app listening on port ${port}`)
    })
  }

  debugSentry() {
    const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(err)
      }
      captureException(err)
      return res.status(500).json({
        error: err.message,
        status: 400
      })
    }
    this.app.use(errorHandler as any)
    this.app.get('/debug-sentry', function mainHandler(req, res) {
      throw new Error('My first Sentry error!')
    })
  }
}

new App().start()

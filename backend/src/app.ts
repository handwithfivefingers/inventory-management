// const moduleAlias = require("module-alias");
// const env = require("dotenv");
// moduleAlias.addAliases({
//   "@src": __dirname + "/",
//   "@libs": __dirname + "/libs",
//   "@db": __dirname + "/database",
//   "@api": __dirname + "/api",
//   "@constant": __dirname + "/constant",
//   "@middleware": __dirname + "/middleware",
//   "@validator": __dirname + "/validator",
//   "@config": __dirname + "/config",
// });
// moduleAlias();
// env.config();
// require("@config/sentry");
// const express = require("express");
// const cors = require("cors");
// const parser = require("cookie-parser");
// const db = require("@db");
// const morgan = require("morgan");
// const helmet = require("helmet");
// const appRouter = require("@api/routes");
// const app = express();
// const Sentry = require("@sentry/node");

// class App {
//   constructor() {
//     this.onInit();
//   }
//   onInit() {
//     app.use(
//       express.json({
//         limit: "50mb",
//       })
//     );
//     app.use(parser());
//     app.use(
//       cors({
//         origin: ["http://localhost:3000", "http://localhost:5173"],
//         credentials: true,
//       })
//     );
//     app.use(morgan("dev"));
//     app.use(helmet());
//     app.use("/api", appRouter);

//     Sentry.setupExpressErrorHandler(app);

//     const errorHandler = async (err, req, res, next) => {
//       if (res.headersSent) {
//         return next(err);
//       }
//       Sentry.captureException(err);
//       return res.status(500).json({
//         error: err.message,
//         status: 400,
//       });
//     };

//     app.use(errorHandler);
//     app.get("/debug-sentry", function mainHandler(req, res) {
//       throw new Error("My first Sentry error!");
//     });
//   }

//   onStart() {
//     app.listen(3001, () => {
//       require("./config/redis"); // Auto register redis
//       db.sync();
//       console.log("Server listen PORT:", 3001);
//     });
//   }
// }

// new App().onStart();

import moduleAlias from 'module-alias'
const __dirname = process.cwd()

moduleAlias.addAliases({
  '@src': __dirname + '/',
  '@libs': __dirname + '/libs',
  '@db': __dirname + '/database',
  '@api': __dirname + '/api',
  '@constant': __dirname + '/constant',
  '@middleware': __dirname + '/middleware',
  '@validator': __dirname + '/validator',
  '@config': __dirname + '/config'
})

moduleAlias()

import express from 'express'
import cors from 'cors'
import parser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import appRouter from '@api/routes'
import { setupExpressErrorHandler, captureException } from '@sentry/node'
import { profiler } from '@src/config/sentry'
import database from '@src/database'
import '@config/redis'
const app = express()
class App {
  constructor() {
    this.onInit()
  }
  onInit() {
    app.use(
      express.json({
        limit: '50mb'
      })
    )
    app.use(parser())
    app.use(
      cors({
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true
      })
    )
    app.use(morgan('dev'))
    app.use(helmet())
    // app.use('/api', appRouter)
    setupExpressErrorHandler(app)
    const errorHandler = async (err, req, res, next) => {
      if (res.headersSent) {
        return next(err)
      }
      captureException(err)
      return res.status(500).json({
        error: err.message,
        status: 400
      })
    }
    app.use(errorHandler)
    app.get('/debug-sentry', function mainHandler(req, res) {
      throw new Error('My first Sentry error!')
    })
  }

  start() {
    app.listen(3001, () => {
      profiler.startProfiler()
      database.sync()
      console.log('Server listen PORT:', 3001)
    })
  }
}

new App().start()

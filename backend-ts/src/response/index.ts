// const Sentry = require('@sentry/node')
import { captureException } from '@sentry/node'
import { Response } from 'express'
export default {
  handleErrors: (req: Request, res: Response, err: Error) => {
    captureException(err)
    return res.status(400).json({})
  }
}

// const Sentry = require('@sentry/node')
import { captureException } from '@sentry/node'
import { Response } from 'express'
export default {
  handleErrors: (req: Request, res: Response, err: Error) => {
    captureException(err)
    return res.status(400).json({})
  }
}

type SequelizeError = Error & { sqlMessage: string; code: string; fields: Record<string, any> }

export class ApiError extends Error {
  status: number = 400
  code?: string
  sqlMessage?: string
  fields?: Record<string, any>
  constructor(err: SequelizeError, status?: number) {
    super(err.message)
    this.name = err.name
    this.message = err.message
    if (err.name.includes('Sequelize')) {
      // this.sqlMessage = err.sqlMessage
      this.code = err.code
      this.fields = err.fields
      this.message = err.sqlMessage
    }
    if (status) {
      this.status = status
    }
  }
}

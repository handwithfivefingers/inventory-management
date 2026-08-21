// Endpoint tracking middleware for backend-ts.
// Logs every API request with method, path, status code, response time,
// client IP and the authenticated user (when available).

import { NextFunction, Request, Response } from 'express'

interface IRequest extends Request {
  locals?: Record<any, any>
}

const statusColor = (status: number): string => {
  if (status >= 500) return '\x1b[31m' // red
  if (status >= 400) return '\x1b[33m' // yellow
  return '\x1b[32m' // green
}

const reset = '\x1b[0m'

const endpointLogger = (req: IRequest, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint()
  const { method, originalUrl } = req
  const ip = req.ip || req.socket.remoteAddress || '-'

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    const status = res.statusCode
    const user = req.locals?.id ? `user=${req.locals.id}` : 'anonymous'
    const time = new Date().toISOString()
    const color = statusColor(status)

    // eslint-disable-next-line no-console
    console.log(
      `${color}[Endpoint]${reset} ${method} ${originalUrl} → ${status} | ${durationMs.toFixed(
        2
      )}ms | ${ip} | ${user} | ${time}`
    )
  })

  next()
}

export { endpointLogger }
export default endpointLogger

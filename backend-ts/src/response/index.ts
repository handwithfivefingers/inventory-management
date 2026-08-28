import { captureException } from '@sentry/node'
import type { Request, Response, NextFunction } from 'express'

type ApiErrorOptions = {
  status?: number
  code?: string
  fields?: Record<string, any>
  cause?: unknown
}

type SequelizeLikeError = Error & {
  name?: string
  sqlMessage?: string
  code?: string
  fields?: Record<string, any>
  original?: SequelizeLikeError
  parent?: SequelizeLikeError
  cause?: unknown
}

function isSequelizeLike(err: unknown): boolean {
  return typeof (err as any)?.name === 'string' && (err as any).name.includes('Sequelize')
}

function unwrapSequelize(err: unknown): SequelizeLikeError | null {
  let current: any = err
  for (let i = 0; i < 3 && current; i++) {
    if (isSequelizeLike(current)) return current as SequelizeLikeError
    current = current.original ?? current.parent ?? (current as any).cause
  }
  return null
}

function resolveStatus(explicit: number | undefined, fallback: number | undefined, defaultStatus: number): number {
  if (Number.isFinite(explicit)) return explicit as number
  if (Number.isFinite(fallback)) return fallback as number
  return defaultStatus
}

export class ApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly fields?: Record<string, any>

  constructor(message: string, status?: number, options?: ApiErrorOptions)
  constructor(cause: unknown, status?: number)
  constructor(arg1: unknown, status?: number, options: ApiErrorOptions = {}) {
    console.log('APIERROR', arg1)
    const isStringInput = typeof arg1 === 'string'
    const cause = isStringInput ? options.cause : arg1

    const sequelizeError = !isStringInput ? unwrapSequelize(cause) : null
    const causeAsError = cause instanceof Error ? cause : undefined

    const derivedMessage = isStringInput
      ? (arg1 as string)
      : sequelizeError?.sqlMessage || causeAsError?.message || 'Internal Server Error'

    super(derivedMessage, causeAsError ? ({ cause: causeAsError } as any) : undefined)
    Object.setPrototypeOf(this, ApiError.prototype)

    this.name = (causeAsError as any)?.name ?? (isStringInput ? 'ApiError' : 'Error')

    const explicitStatus = Number.isFinite(status) ? status : options.status
    this.status = resolveStatus(explicitStatus, undefined, 400)

    this.code = options.code ?? sequelizeError?.code ?? (causeAsError as any)?.code
    this.fields = options.fields ?? sequelizeError?.fields ?? (causeAsError as any)?.fields

    if (cause && !(this as any).cause) {
      ;(this as any).cause = cause
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      status: this.status,
      ...(this.code !== undefined && { code: this.code }),
      ...(this.fields !== undefined && { fields: this.fields })
    }
  }

  static from(err: unknown, status?: number): ApiError {
    if (err instanceof ApiError) {
      if (status !== undefined && Number.isFinite(status) && err.status !== status) {
        return new ApiError(err.message, status, {
          code: err.code,
          fields: err.fields,
          cause: (err as any).cause ?? err
        })
      }
      return err
    }
    return new ApiError(err, status)
  }

  static badRequest(message: string, options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 400, options)
  }

  static unauthorized(message = 'Unauthorized', options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 401, options)
  }

  static forbidden(message = 'Forbidden', options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 403, options)
  }

  static notFound(message = 'Not Found', options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 404, options)
  }

  static conflict(message: string, options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 409, options)
  }

  static unprocessable(message: string, options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 422, options)
  }

  static internal(message = 'Internal Server Error', options?: Omit<ApiErrorOptions, 'status'>): ApiError {
    return new ApiError(message, 500, options)
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export function handleErrors(err: unknown, req: Request, res: Response, next: NextFunction): void
export function handleErrors(req: Request, res: Response, err: unknown): void
export function handleErrors(a: unknown, b: unknown, c: unknown, d?: unknown): void {
  let err: unknown
  let res: Response
  let next: NextFunction | undefined

  // Legacy shim: (req, res, err) => b has .status function; Standard: (err, req, res, next) => b is Request without .status
  const bHasStatus = typeof (b as any)?.status === 'function'
  if (bHasStatus) {
    // legacy (req, res, err)
    res = b as Response
    err = c
    next = d as NextFunction | undefined
  } else {
    // standard (err, req, res, next)
    err = a
    res = c as Response
    next = d as NextFunction | undefined
  }

  const resAny = res as any
  if (resAny?.headersSent) {
    if (next) return next(err as any)
    return
  }

  captureException(err as any)

  const apiError = ApiError.from(err)
  const rawStatus = (err as any)?.status ?? apiError.status
  const status = Number.isFinite(rawStatus) ? rawStatus : 500
  const isClientError = status >= 400 && status < 500

  const body = isClientError ? apiError.toJSON() : { error: 'Internal Server Error', status }

  // Ensure status reflects apiError for client errors but allow err.status override for 5xx generic
  // Use computed status so monitoring sees real fault rates (mirrors src/index.ts:68)
  resAny.status(status).json(body)
}

export default {
  handleErrors,
  ApiError
}

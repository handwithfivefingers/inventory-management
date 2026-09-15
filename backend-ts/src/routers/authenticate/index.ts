import AuthenticateController from '#/controllers/authenticate/index'
import { rateLimit } from '#/middleware/rateLimit'
import { auth } from '#/middleware/authenticate'
import { loginValidator, registerValidator } from './validator'
import express from 'express'
const router = express.Router()

// SECURITY 2: brute-force throttle - 10 attempts/min per IP+account pair.
router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10, accountKey: 'email' }),
  loginValidator as any,
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Login with email & password'
  // #swagger.description = 'Authenticate user, set httpOnly session cookie and return JWT token'
  /* #swagger.parameters['body'] = { in: 'body', description: 'Login credentials', required: true, schema: { $ref: '#/definitions/LoginBody' } } */
  new AuthenticateController().login
)
router.post(
  '/register',
  registerValidator as any,
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Register new user'
  /* #swagger.parameters['body'] = { in: 'body', description: 'Registration data', required: true, schema: { $ref: '#/definitions/RegisterBody' } } */
  new AuthenticateController().register
)
router.get(
  '/me',
  auth,
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Get current authenticated user'
  // #swagger.security = [{ "bearerAuth": [] }, { "cookieAuth": [] }]
  new AuthenticateController().get as any
)
router.post(
  '/logout',
  auth,
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Logout current user'
  // #swagger.description = 'Clears session cookie and user cache'
  // #swagger.security = [{ "bearerAuth": [] }, { "cookieAuth": [] }]
  new AuthenticateController().logout as any
)

export default router

import AuthenticateController from '#/controllers/authenticate/index'
import { rateLimit } from '#/middleware/rateLimit'
import { auth } from '#/middleware/authenticate'
import { loginValidator } from './validator'
import express from 'express'
const router = express.Router()

// SECURITY 2: brute-force throttle - 10 attempts/min per IP+account pair.
router.post('/login', rateLimit({ windowMs: 60_000, max: 10, accountKey: 'email' }), loginValidator as any, new AuthenticateController().login)
router.post('/register', new AuthenticateController().register)
router.get('/me', auth, new AuthenticateController().get as any)
router.post('/logout', auth, new AuthenticateController().logout as any)

export default router

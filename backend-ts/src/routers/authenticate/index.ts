import AuthenticateController from '#/controllers/authenticate/index'
import { auth } from '#/middleware/authenticate'
import { loginValidator } from './validator'
import express from 'express'
const router = express.Router()

router.post('/login', loginValidator as any, new AuthenticateController().login)
router.post('/register', new AuthenticateController().register)
router.get('/me', auth, new AuthenticateController().get)
router.post('/logout', (req, res) => {
  res.clearCookie('session')
  res.status(200).json({
    data: {
      message: 'Logout successfully'
    }
  })
  return
})

export default router

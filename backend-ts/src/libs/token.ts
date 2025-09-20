// const jwt = require('jsonwebtoken')

import jwt from 'jsonwebtoken'

const EXPIRED_TIME = 60 * 60 * 24
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret'
const signToken = (payload: Record<string, any>) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRED_TIME })
}
const decodeToken = async (token: string) => {
  const decoded = jwt.decode(token, { json: true })
  if (!decoded) {
    throw new Error('Token invalid')
  }
  let now = new Date().getTime()
  if (now / 1000 > (decoded as any)?.exp) {
    throw new Error('Token expired')
  }
  return decoded
}

const verifyToken = <T>(token: string): T | false => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as T 
    return decoded as T
  } catch (error) {
    return false
  }
}

export { signToken, decodeToken, verifyToken }

import { Redis } from '#/configs/redis'
import database from '#/database'
import { cacheDel, cacheItem, cacheKey } from '#/services/authenticate/cache'
import { NextFunction, Request, Response } from 'express'

interface IRequestLocal extends Request {
  locals: {
    id: number
    email: string
  }
}

/**
 * Update user profile with cache invalidation
 */
export async function updateUserProfile(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.locals.id
    const userEmail = req.locals.email
    const updates = req.body

    // Update user in database
    const user = await database.user.findByPk(userId)
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        status: 404
      })
      return
    }

    await user.update(updates)

    // Invalidate cache for this user
    await cacheDel(cacheKey('User', userEmail))

    // Optionally refresh cache with new data
    await cacheItem({
      key: cacheKey('User', userEmail),
      callback: async () => {
        const updatedUser = await database.user.findOne({
          where: { id: userId },
          include: [
            {
              model: database.role,
              include: {
                model: database.permission,
                through: { attributes: ['C', 'R', 'U', 'D'] }
              } as any
            },
            {
              model: database.vendor,
              include: {
                model: database.warehouse
              } as any
            }
          ]
        })
        return updatedUser
      }
    })

    res.status(200).json({
      data: {
        message: 'Profile updated successfully'
      }
    })
    return
  } catch (error) {
    next(error)
  }
}

/**
 * Update user roles with cache invalidation
 */
export async function updateUserRoles(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.locals.id
    const userEmail = req.locals.email
    const { roleIds } = req.body

    const user = await database.user.findByPk(userId, {
      include: [database.role]
    })

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        status: 404
      })
      return
    }

    // Single-role policy: only the first role id is honored - a user holds
    // exactly one role, so this REPLACES any previous assignment.
    const roleId = Array.isArray(roleIds) ? roleIds[0] : roleIds
    if (!roleId) {
      res.status(400).json({
        error: 'roleIds must contain at least one role',
        status: 400
      })
      return
    }

    // Set new roles (replacing whatever was there)
    const roles = await database.role.findAll({
      where: { id: roleId }
    })
    if (!roles.length) {
      res.status(404).json({
        error: 'Role not found',
        status: 404
      })
      return
    }
    await user.setRoles(roles)

    // Invalidate cache
    await cacheDel(cacheKey('User', userEmail))

    res.status(200).json({
      data: {
        message: 'Roles updated successfully'
      }
    })
    return
  } catch (error) {
    next(error)
  }
}

/**
 * Invalidate user cache by user ID
 * Useful when user data is modified from admin panel
 */
export async function invalidateUserCache(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, email } = req.body

    if (!email) {
      res.status(400).json({
        error: 'Email is required',
        status: 400
      })
      return
    }

    await cacheDel(cacheKey('User', email))

    res.status(200).json({
      data: {
        message: 'Cache invalidated successfully'
      }
    })
    return
  } catch (error) {
    next(error)
  }
}

/**
 * Invalidate all user caches (admin only)
 * Use with caution - clears all user sessions
 */
export async function invalidateAllUserCaches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const redisInstance = new Redis()
    const pattern = cacheKey('User', '*')
    const keys = await redisInstance.redis.keys(pattern)

    if (keys.length > 0) {
      await redisInstance.redis.del(...keys)
    }

    res.status(200).json({
      data: {
        message: `Invalidated ${keys.length} user caches`,
        count: keys.length
      }
    })
    return
  } catch (error) {
    next(error)
  }
}

export default {
  updateUserProfile,
  updateUserRoles,
  invalidateUserCache,
  invalidateAllUserCaches
}

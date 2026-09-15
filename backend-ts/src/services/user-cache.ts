import redisClient from '#/configs/redis'
import database from '#/database'
import { invalidateUserAuthCache } from '#/services/authenticate/userAuth'
import { IRequestLocal } from '#/types/common'
import { NextFunction, Request, Response } from 'express'

/**
 * User cache helpers backed by the single `UserAuth:{userId}` entry
 * (see services/authenticate/userAuth). Mutation paths only INVALIDATE —
 * the next authenticated request reloads fresh from the DB and repopulates
 * the short-TTL cache, so `vendorIds`/roles can never serve stale scope
 * beyond the TTL.
 */

/**
 * Update user profile with cache invalidation
 */
export async function updateUserProfile(req: IRequestLocal, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number((req as any)?.user?.id ?? (req as any)?.locals?.id)
    if (!Number.isFinite(userId)) {
      res.status(401).json({
        error: 'Unauthorized',
        status: 401
      })
      return
    }
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

    // Invalidate the unified auth cache; next request starts fresh.
    await invalidateUserAuthCache(userId)

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
    const userId = Number((req as any)?.user?.id ?? (req as any)?.locals?.id)
    if (!Number.isFinite(userId)) {
      res.status(401).json({
        error: 'Unauthorized',
        status: 401
      })
      return
    }
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

    // Invalidate the unified auth cache; next request starts fresh.
    await invalidateUserAuthCache(userId)

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
    const { userId } = req.body

    if (!Number.isFinite(Number(userId))) {
      res.status(400).json({
        error: 'userId is required',
        status: 400
      })
      return
    }

    await invalidateUserAuthCache(Number(userId))

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
    const count = await redisClient.cacheDelPattern(redisClient.cacheKey('UserAuth', '*'))

    res.status(200).json({
      data: {
        message: `Invalidated ${count} user caches`,
        count
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

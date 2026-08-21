import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermission, useResourcePermission, useIsAdmin, useHasRole, useAllPermissions } from '../use-permission'
import { useUser } from '~/store/user.store'

// Mock the useUser store
vi.mock('~/store/user.store', () => ({
  useUser: vi.fn()
}))

describe('Permission Hooks', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: [
      {
        id: 1,
        name: 'Admin',
        permissions: [
          { id: 1, name: 'product', C: true, R: true, U: true, D: true },
          { id: 2, name: 'order', C: true, R: true, U: true, D: false },
          { id: 3, name: 'warehouse', C: false, R: true, U: false, D: false }
        ]
      }
    ],
    vendors: [],
    defaultVendorId: null,
    defaultWarehouseId: null
  }

  const mockNonAdminUser = {
    ...mockUser,
    roles: [
      {
        id: 2,
        name: 'User',
        permissions: [
          { id: 1, name: 'product', C: false, R: true, U: false, D: false },
          { id: 2, name: 'order', C: false, R: true, U: false, D: false }
        ]
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePermission', () => {
    it('should return true when user has the required permission', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => usePermission('C', 'product'))
      
      expect(result.current).toBe(true)
    })

    it('should return false when user lacks the required permission', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockNonAdminUser, roles: mockNonAdminUser.roles } as any)
      
      const { result } = renderHook(() => usePermission('C', 'product'))
      
      expect(result.current).toBe(false)
    })

    it('should return false when user has no roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: { ...mockUser, roles: [] } } as any)
      
      const { result } = renderHook(() => usePermission('C', 'product'))
      
      expect(result.current).toBe(false)
    })

    it('should return false when user is undefined', () => {
      vi.mocked(useUser).mockReturnValue({ user: undefined } as any)
      
      const { result } = renderHook(() => usePermission('C', 'product'))
      
      expect(result.current).toBe(false)
    })

    it('should check permission without module name', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => usePermission('R'))
      
      expect(result.current).toBe(true)
    })
  })

  describe('useResourcePermission', () => {
    it('should return true for create permission on product', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useResourcePermission('product', 'create'))
      
      expect(result.current).toBe(true)
    })

    it('should return true for read permission on order', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useResourcePermission('order', 'read'))
      
      expect(result.current).toBe(true)
    })

    it('should return false for delete permission on order', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useResourcePermission('order', 'delete'))
      
      expect(result.current).toBe(false)
    })

    it('should return false for update permission on warehouse', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useResourcePermission('warehouse', 'update'))
      
      expect(result.current).toBe(false)
    })
  })

  describe('useIsAdmin', () => {
    it('should return true when user has Admin role', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current).toBe(true)
    })

    it('should return false when user does not have Admin role', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockNonAdminUser, roles: mockNonAdminUser.roles } as any)
      
      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current).toBe(false)
    })

    it('should return false when user has no roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: { ...mockUser, roles: [] } } as any)
      
      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current).toBe(false)
    })

    it('should be case-insensitive for admin role', () => {
      const adminUser = {
        ...mockUser,
        roles: [{ id: 1, name: 'administrator', permissions: [] }]
      }
      vi.mocked(useUser).mockReturnValue({ user: adminUser, roles: adminUser.roles } as any)
      
      const { result } = renderHook(() => useIsAdmin())
      
      expect(result.current).toBe(true)
    })
  })

  describe('useHasRole', () => {
    it('should return true when user has one of the specified roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useHasRole(['Admin', 'Manager']))
      
      expect(result.current).toBe(true)
    })

    it('should return false when user has none of the specified roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockNonAdminUser, roles: mockNonAdminUser.roles } as any)
      
      const { result } = renderHook(() => useHasRole(['Admin', 'Manager']))
      
      expect(result.current).toBe(false)
    })

    it('should be case-insensitive for role names', () => {
      vi.mocked(useUser).mockReturnValue({ user: mockUser, roles: mockUser.roles } as any)
      
      const { result } = renderHook(() => useHasRole(['admin', 'MANAGER']))
      
      expect(result.current).toBe(true)
    })

    it('should return false when user has no roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: { ...mockUser, roles: [] } } as any)
      
      const { result } = renderHook(() => useHasRole(['Admin']))
      
      expect(result.current).toBe(false)
    })
  })

  describe('useAllPermissions', () => {
    it('should return all unique permissions from all roles', () => {
      const userWithMultipleRoles = {
        ...mockUser,
        roles: [
          {
            id: 1,
            name: 'Admin',
            permissions: [
              { id: 1, name: 'product', C: true, R: true, U: true, D: true }
            ]
          },
          {
            id: 2,
            name: 'Manager',
            permissions: [
              { id: 2, name: 'order', C: true, R: true, U: true, D: false },
              { id: 1, name: 'product', C: true, R: true, U: true, D: true } // Duplicate
            ]
          }
        ]
      }
      vi.mocked(useUser).mockReturnValue({ user: userWithMultipleRoles } as any)
      
      const { result } = renderHook(() => useAllPermissions())
      
      expect(result.current).toHaveLength(2) // Should deduplicate
      expect(result.current.map(p => p.name)).toContain('product')
      expect(result.current.map(p => p.name)).toContain('order')
    })

    it('should return empty array when user has no roles', () => {
      vi.mocked(useUser).mockReturnValue({ user: { ...mockUser, roles: [] } } as any)
      
      const { result } = renderHook(() => useAllPermissions())
      
      expect(result.current).toHaveLength(0)
    })

    it('should return empty array when user is undefined', () => {
      vi.mocked(useUser).mockReturnValue({ user: undefined } as any)
      
      const { result } = renderHook(() => useAllPermissions())
      
      expect(result.current).toHaveLength(0)
    })
  })
})

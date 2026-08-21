import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PermissionGuard, PermissionButton } from '../permission-guard'
import * as usePermissionHooks from '~/hooks/use-permission'

// Mock the permission hooks
vi.mock('~/hooks/use-permission', () => ({
  usePermission: vi.fn(),
  useIsAdmin: vi.fn(),
  useHasRole: vi.fn()
}))

describe('PermissionGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user has permission', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard permission="C" module="product">
        <button>Create Product</button>
      </PermissionGuard>
    )

    expect(screen.getByText('Create Product')).toBeInTheDocument()
  })

  it('should not render children when user lacks permission', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard permission="C" module="product">
        <button>Create Product</button>
      </PermissionGuard>
    )

    expect(screen.queryByText('Create Product')).not.toBeInTheDocument()
  })

  it('should render fallback when provided and user lacks permission', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard 
        permission="C" 
        module="product"
        fallback={<div>No Permission</div>}
      >
        <button>Create Product</button>
      </PermissionGuard>
    )

    expect(screen.getByText('No Permission')).toBeInTheDocument()
  })

  it('should render children when user is admin (requireAdmin)', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard requireAdmin>
        <button>Admin Action</button>
      </PermissionGuard>
    )

    expect(screen.getByText('Admin Action')).toBeInTheDocument()
  })

  it('should not render children when requireAdmin is true and user is not admin', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard requireAdmin>
        <button>Admin Action</button>
      </PermissionGuard>
    )

    expect(screen.queryByText('Admin Action')).not.toBeInTheDocument()
  })

  it('should render children when user has required role', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(true)

    render(
      <PermissionGuard roles={['Manager', 'Admin']}>
        <button>Manager Action</button>
      </PermissionGuard>
    )

    expect(screen.getByText('Manager Action')).toBeInTheDocument()
  })

  it('should check multiple conditions (permission AND admin)', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard permission="C" module="product" requireAdmin>
        <button>Admin Create</button>
      </PermissionGuard>
    )

    expect(screen.getByText('Admin Create')).toBeInTheDocument()
  })

  it('should fail when one condition is not met', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard permission="C" module="product" requireAdmin>
        <button>Admin Create</button>
      </PermissionGuard>
    )

    expect(screen.queryByText('Admin Create')).not.toBeInTheDocument()
  })

  it('does not render when a role matches but the permission is missing (AND)', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(true)

    render(
      <PermissionGuard permission="C" module="product" roles={['Manager']}>
        <button>Role But No Perm</button>
      </PermissionGuard>
    )

    expect(screen.queryByText('Role But No Perm')).not.toBeInTheDocument()
  })

  it('renders with only a permission when roles/admin are absent', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionGuard permission="C" module="product">
        <button>Only Perm</button>
      </PermissionGuard>
    )

    expect(screen.getByText('Only Perm')).toBeInTheDocument()
  })
})

describe('PermissionButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render enabled button when user has permission', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionButton permission="C" module="product">
        Create
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /create/i })
    expect(button).not.toBeDisabled()
    expect(button).toHaveClass('bg-indigo-600')
  })

  it('should render disabled button when user lacks permission', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionButton permission="C" module="product">
        Create
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /create/i })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('bg-gray-300')
  })

  it('should hide button when hideIfNoPermission is true', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionButton 
        permission="C" 
        module="product"
        hideIfNoPermission
      >
        Create
      </PermissionButton>
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should respect disabled prop', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)

    render(
      <PermissionButton permission="C" module="product" disabled>
        Create
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /create/i })
    expect(button).toBeDisabled()
  })

  it('should call onClick when clicked and allowed', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(true)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)
    
    const handleClick = vi.fn()

    render(
      <PermissionButton permission="C" module="product" onClick={handleClick}>
        Create
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /create/i })
    button.click()

    expect(handleClick).toHaveBeenCalled()
  })

  it('should not call onClick when clicked and not allowed', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(false)
    
    const handleClick = vi.fn()

    render(
      <PermissionButton permission="C" module="product" onClick={handleClick}>
        Create
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /create/i })
    button.click()

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render an enabled button when a required role matches', () => {
    vi.mocked(usePermissionHooks.usePermission).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useIsAdmin).mockReturnValue(false)
    vi.mocked(usePermissionHooks.useHasRole).mockReturnValue(true)

    render(
      <PermissionButton roles={['Manager']}>
        Manager
      </PermissionButton>
    )

    const button = screen.getByRole('button', { name: /manager/i })
    expect(button).not.toBeDisabled()
  })
})

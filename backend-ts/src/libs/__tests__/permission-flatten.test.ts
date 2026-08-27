import { describe, expect, it } from 'vitest'
import {
  flattenRolePermissions,
  flattenRoles
} from '#/libs/permission'
import {
  planLegacyMerge,
  ILegacyPermission,
  ILegacyJoinRow
} from '#/services/permissionSync'

describe('flattenRolePermissions', () => {
  it('lifts join-table flags into the flat shape', () => {
    const role = {
      name: 'Staff',
      permissions: [
        { id: 1, name: 'product', role_permission: { C: false, R: true, U: false, D: false } }
      ]
    }
    expect(flattenRolePermissions(role as any)).toEqual([
      { id: 1, name: 'product', C: false, R: true, U: false, D: false }
    ])
  })

  it('tolerates already-flat rows (legacy mocks / API shapes)', () => {
    const role = {
      name: 'Staff',
      permissions: [{ id: 2, name: 'order', C: true, R: true, U: true, D: true }]
    }
    expect(flattenRolePermissions(role as any)).toEqual([
      { id: 2, name: 'order', C: true, R: true, U: true, D: true }
    ])
  })

  it('coerces missing flags to false and survives empty roles', () => {
    expect(flattenRolePermissions({ permissions: [{ name: 'tag' }] } as any)).toEqual([
      { id: undefined, name: 'tag', C: false, R: false, U: false, D: false }
    ])
    expect(flattenRolePermissions(undefined)).toEqual([])
    expect(flattenRolePermissions({} as any)).toEqual([])
  })

  it('flattenRoles maps every role preserving its name', () => {
    const roles = [
      { name: 'Admin', permissions: [] },
      { name: 'Staff', permissions: [{ name: 'unit', role_permission: { R: true } }] }
    ]
    const result = flattenRoles(roles as any)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Admin')
    expect(result[1].permissions).toEqual([
      { id: undefined, name: 'unit', C: false, R: true, U: false, D: false }
    ])
    expect(flattenRoles(undefined)).toEqual([])
  })
})

describe('planLegacyMerge (hybrid data migration planner)', () => {
  const perm = (id: number, name: string, C = false, R = false, U = false, D = false): ILegacyPermission =>
    ({ id, name, C, R, U, D })

  it('keeps the lowest id per name as canonical', () => {
    const plan = planLegacyMerge(
      [perm(5, 'product'), perm(2, 'product'), perm(9, 'order')],
      []
    )
    expect(plan.canonicalPermissionIds.sort()).toEqual([2, 9])
  })

  it('moves flags from legacy permission rows onto join rows', () => {
    // Staff's product grant was read-only; Admin's order grant was full.
    const plan = planLegacyMerge(
      [perm(1, 'product', false, true, false, false), perm(2, 'order', true, true, true, true)],
      [
        { roleId: 10, permissionId: 1 },
        { roleId: 11, permissionId: 2 }
      ]
    )
    expect(plan.joinRows).toEqual([
      { roleId: 10, permissionId: 1, C: false, R: true, U: false, D: false },
      { roleId: 11, permissionId: 2, C: true, R: true, U: true, D: true }
    ])
  })

  it('remaps duplicate links to the canonical id without losing grants', () => {
    const plan = planLegacyMerge(
      [perm(1, 'product'), perm(7, 'product', false, true, false, false)],
      [{ roleId: 10, permissionId: 7 }]
    )
    expect(plan.joinRows).toEqual([
      { roleId: 10, permissionId: 1, C: false, R: true, U: false, D: false }
    ])
  })

  it('OR-merges collisions when a role linked two copies of one module', () => {
    const plan = planLegacyMerge(
      [perm(1, 'product', true, true, false, false), perm(7, 'product', false, true, true, true)],
      [
        { roleId: 10, permissionId: 1 },
        { roleId: 10, permissionId: 7 }
      ]
    )
    expect(plan.joinRows).toEqual([
      { roleId: 10, permissionId: 1, C: true, R: true, U: true, D: true }
    ])
  })

  it('prefers explicit join flags over legacy permission flags', () => {
    const plan = planLegacyMerge(
      [perm(1, 'product', false, true, false, false)],
      [{ roleId: 10, permissionId: 1, C: true }]
    )
    expect(plan.joinRows[0]).toMatchObject({ C: true, R: true, U: false, D: false })
  })

  it('drops dangling join rows whose permission vanished', () => {
    const plan = planLegacyMerge([perm(1, 'product')], [{ roleId: 10, permissionId: 99 }])
    expect(plan.joinRows).toEqual([])
  })

  it('handles completely empty input', () => {
    const plan = planLegacyMerge([], [])
    expect(plan).toEqual({ joinRows: [], canonicalPermissionIds: [] })
  })
})

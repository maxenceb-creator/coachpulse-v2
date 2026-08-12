import { describe, expect, it } from 'vitest'
import {
  hasPermission,
  isAccessActive,
  resolveAccessibleTeamAccesses,
} from './permissionsService'
import type { TeamAccess } from '../types/domain'
const a: TeamAccess = {
  userTeamAccessId: 'u_t',
  userId: 'u',
  teamId: 't',
  status: 'ACTIVE',
  rolePermissions: {
    coach: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
  },
}
describe('permissions', () => {
  it('refuse par défaut', () =>
    expect(
      hasPermission([a], {
        userId: 'u',
        teamId: 't',
        activeRoleId: 'coach',
        permissionKey: 'players.write',
      }),
    ).toBe(false))
  it('respecte le rôle actif', () =>
    expect(
      hasPermission([a], {
        userId: 'u',
        teamId: 't',
        activeRoleId: 'coach',
        permissionKey: 'players.read',
      }),
    ).toBe(true))
  it('refuse un accès expiré', () =>
    expect(
      isAccessActive(
        { ...a, endDate: new Date('2025-01-01') },
        new Date('2026-01-01'),
      ),
    ).toBe(false))
  it('propose U13F et U14F quand Coach principal est autorisé sur les deux', () => {
    const accesses: TeamAccess[] = [
      { ...a, userTeamAccessId: 'u_u13', teamId: 'team-dev-u13f' },
      { ...a, userTeamAccessId: 'u_u14', teamId: 'team-dev-u14f' },
      {
        ...a,
        userTeamAccessId: 'u_first',
        teamId: 'team-first-demo',
        rolePermissions: {
          admin: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
        },
      },
    ]

    const result = resolveAccessibleTeamAccesses(
      accesses,
      'u',
      'coach',
      new Date('2026-08-12T12:00:00.000Z'),
    )

    expect(result.roleAccesses.map(({ teamId }) => teamId)).toEqual([
      'team-dev-u13f',
      'team-dev-u14f',
    ])
  })
})

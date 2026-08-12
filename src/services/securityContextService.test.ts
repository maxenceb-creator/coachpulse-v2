import { afterEach, describe, expect, it, vi } from 'vitest'
import { repositories } from '../repositories/appRepositories'
import type { Role, TeamAccess, User } from '../types/domain'
import { securityContextService } from './securityContextService'

vi.mock('../repositories/appRepositories', () => ({
  repositories: { setSecurityContext: vi.fn() },
}))

const user: User = {
  userId: 'user-a',
  firstName: 'A',
  lastName: 'User',
  email: 'a@example.com',
  status: 'ACTIVE',
  roleIds: ['coach'],
}
const roles: Role[] = [
  {
    roleId: 'coach',
    code: 'COACH_PRINCIPAL',
    label: 'Coach',
    isActive: true,
    defaultPermissions: [],
  },
]
const accesses: TeamAccess[] = [
  {
    userTeamAccessId: 'user-a_team-a',
    userId: 'user-a',
    teamId: 'team-a',
    status: 'ACTIVE',
    rolePermissions: {
      coach: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
    },
  },
]

describe('securityContextService', () => {
  afterEach(() => vi.clearAllMocks())

  it('persiste uniquement un contexte localement autorisé', async () => {
    await securityContextService.select({
      user,
      roles,
      accesses,
      activeRoleId: 'coach',
      activeTeamId: 'team-a',
      activeSeasonId: 'season-a',
    })
    expect(repositories.setSecurityContext).toHaveBeenCalledWith(
      'user-a',
      'coach',
      'team-a',
      'season-a',
    )
  })

  it('refuse un roleId falsifié avant la requête Firestore', async () => {
    await expect(
      securityContextService.select({
        user,
        roles,
        accesses,
        activeRoleId: 'admin',
        activeTeamId: 'team-a',
        activeSeasonId: 'season-a',
      }),
    ).rejects.toThrow('PERMISSION_DENIED')
    expect(repositories.setSecurityContext).not.toHaveBeenCalled()
  })
})

import { repositories } from '../repositories/appRepositories'
import type { Role, TeamAccess, User } from '../types/domain'
import { canAccessTeam } from './permissionsService'

export const securityContextService = {
  async select(input: {
    user: User
    roles: Role[]
    accesses: TeamAccess[]
    activeRoleId: string
    activeTeamId: string
    activeSeasonId: string
  }) {
    const {
      user,
      roles,
      accesses,
      activeRoleId,
      activeTeamId,
      activeSeasonId,
    } = input
    if (
      user.status !== 'ACTIVE' ||
      !user.roleIds.includes(activeRoleId) ||
      !roles.some((role) => role.roleId === activeRoleId && role.isActive) ||
      !canAccessTeam(accesses, user.userId, activeRoleId, activeTeamId)
    ) {
      throw new Error('PERMISSION_DENIED')
    }

    await repositories.setSecurityContext(
      user.userId,
      activeRoleId,
      activeTeamId,
      activeSeasonId,
    )
  },
}

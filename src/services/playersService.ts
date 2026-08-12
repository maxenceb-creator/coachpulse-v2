import { repositories } from '../repositories/appRepositories'
import { isAssignmentEffective } from './assignmentsService'

export const playersService = {
  async countEffectiveByTeam(
    teamId: string,
    seasonId: string,
    roleId: string,
    effectiveAt = new Date(),
  ) {
    const assignments = await repositories.assignmentsForTeam(teamId, seasonId)
    const effectiveAssignments = assignments.filter((assignment) =>
      isAssignmentEffective(assignment, effectiveAt),
    )
    const playerIds = [
      ...new Set(effectiveAssignments.map(({ playerId }) => playerId)),
    ]
    if (import.meta.env.DEV) {
      console.debug('[Players DEV] Contexte et affectations', {
        teamId,
        seasonId,
        roleId,
        effectiveAt: effectiveAt.toISOString(),
        assignmentsCount: assignments.length,
        effectiveAssignmentsCount: effectiveAssignments.length,
        playerIds,
      })
    }
    const playersCount = await repositories.activePlayerCount(playerIds)
    if (import.meta.env.DEV) {
      console.debug('[Players DEV] Joueuses lues', {
        teamId,
        seasonId,
        roleId,
        playersCount,
      })
    }
    return playersCount
  },
}

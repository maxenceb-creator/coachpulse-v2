import { repositories } from '../repositories/appRepositories'
import { isAssignmentEffective } from './assignmentsService'

export const playersService = {
  async countEffectiveByTeam(
    teamId: string,
    seasonId: string,
    effectiveAt = new Date(),
  ) {
    const assignments = await repositories.assignmentsForTeam(teamId, seasonId)
    const playerIds = [
      ...new Set(
        assignments
          .filter((assignment) =>
            isAssignmentEffective(assignment, effectiveAt),
          )
          .map(({ playerId }) => playerId),
      ),
    ]
    return repositories.activePlayerCount(playerIds)
  },
}

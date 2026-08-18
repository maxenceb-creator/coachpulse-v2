import { repositories } from '../repositories/appRepositories'
import { isAssignmentEffective } from './assignmentsService'
import { hasPermission } from './permissionsService'
import type { TeamAccess } from '../types/domain'

export type PlayerProfileContext = {
  userId: string
  activeRoleId: string
  teamId: string
  seasonId: string
  accesses: TeamAccess[]
  categoryId?: string
}

export class PlayerProfileError extends Error {
  constructor(
    public readonly code:
      'PERMISSION_DENIED' | 'PLAYER_NOT_FOUND' | 'PLAYER_OUT_OF_SCOPE',
  ) {
    super(code)
  }
}

export const playersService = {
  async listScopedPlayers(context: PlayerProfileContext) {
    if (
      !hasPermission(context.accesses, {
        userId: context.userId,
        activeRoleId: context.activeRoleId,
        teamId: context.teamId,
        permissionKey: 'players.read',
      })
    )
      throw new PlayerProfileError('PERMISSION_DENIED')
    const assignments = await repositories.assignmentsForTeam(
      context.teamId,
      context.seasonId,
    )
    const playerIds = [
      ...new Set(
        assignments
          .filter((item) => isAssignmentEffective(item, new Date()))
          .map(({ playerId }) => playerId),
      ),
    ]
    return repositories.activePlayers(playerIds)
  },

  getProfileIdentity(
    context: PlayerProfileContext,
    playerId: string,
    roster: Awaited<ReturnType<typeof repositories.activePlayers>>,
  ) {
    if (
      !hasPermission(context.accesses, {
        userId: context.userId,
        activeRoleId: context.activeRoleId,
        teamId: context.teamId,
        permissionKey: 'players.read',
      })
    )
      throw new PlayerProfileError('PERMISSION_DENIED')
    const player = roster.find((item) => item.playerId === playerId)
    if (!player) throw new PlayerProfileError('PLAYER_OUT_OF_SCOPE')
    return { player, rosterCount: roster.length }
  },

  async getProfileTaxonomy(context: PlayerProfileContext, birthYear: number) {
    const category = context.categoryId
      ? await repositories.category(context.categoryId)
      : null
    const subCategories = category
      ? await repositories.subCategories(category.subCategoryIds)
      : []
    const subCategory = subCategories.find(
      ({ birthYearRule }) => birthYearRule === birthYear,
    )
    return { category, subCategory }
  },
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

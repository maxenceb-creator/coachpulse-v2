import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  playersService,
  type PlayerProfileContext,
} from '../services/playersService'

export type PlayerProfileHookContext = PlayerProfileContext & {
  securityContextReady: boolean
}

const ready = (context: PlayerProfileHookContext) =>
  context.securityContextReady &&
  !!context.userId &&
  !!context.activeRoleId &&
  !!context.teamId &&
  !!context.seasonId

export const usePlayerProfile = (
  context: PlayerProfileHookContext,
  playerId: string,
) => {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.players.profile(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: async () => {
      const rosterKey = queryKeys.players.roster(
        context.userId,
        context.activeRoleId,
        context.teamId,
        context.seasonId,
      )
      const roster = await client.ensureQueryData({
        queryKey: rosterKey,
        staleTime: 5 * 60 * 1000,
        queryFn: () => playersService.listScopedPlayers(context),
      })
      return playersService.getProfileIdentity(context, playerId, roster)
    },
    enabled: ready(context) && !!playerId,
    staleTime: 5 * 60 * 1000,
  })
}

export const usePlayerProfileTaxonomy = (
  context: PlayerProfileHookContext,
  birthYear?: number,
) =>
  useQuery({
    queryKey: queryKeys.players.taxonomy(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      context.categoryId ?? 'none',
      birthYear ?? 'unknown',
    ),
    queryFn: () => playersService.getProfileTaxonomy(context, birthYear!),
    enabled: ready(context) && !!birthYear,
    staleTime: 5 * 60 * 1000,
  })

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  playersService,
  type PlayerProfileContext,
} from '../services/playersService'

export type PlayerProfileHookContext = PlayerProfileContext & {
  securityContextReady: boolean
}

export const usePlayerProfile = (
  context: PlayerProfileHookContext,
  playerId: string,
) =>
  useQuery({
    queryKey: queryKeys.players.profile(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: () => playersService.getProfile(context, playerId),
    enabled:
      context.securityContextReady &&
      !!context.userId &&
      !!context.activeRoleId &&
      !!context.teamId &&
      !!context.seasonId &&
      !!playerId,
    staleTime: 5 * 60 * 1000,
  })

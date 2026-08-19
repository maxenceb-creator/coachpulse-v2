import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  playerAttendanceService,
  type PlayerAttendanceContext,
} from '../services/playerAttendanceService'
import { playersService } from '../services/playersService'
import { hasPermission } from '../services/permissionsService'

export type PlayerAttendanceHookContext = PlayerAttendanceContext & {
  securityContextReady: boolean
}

export const usePlayerAttendance = (
  context: PlayerAttendanceHookContext,
  playerId: string,
) => {
  const client = useQueryClient()
  const authorized = hasPermission(context.accesses, {
    userId: context.userId,
    activeRoleId: context.activeRoleId,
    teamId: context.teamId,
    permissionKey: 'attendance.read',
  })
  return useQuery({
    queryKey: queryKeys.attendance.playerSummary(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: async () => {
      const roster = await client.ensureQueryData({
        queryKey: queryKeys.players.roster(
          context.userId,
          context.activeRoleId,
          context.teamId,
          context.seasonId,
        ),
        queryFn: () => playersService.listScopedPlayers(context),
        staleTime: 5 * 60 * 1000,
      })
      return playerAttendanceService.getPlayerSummary(context, playerId, roster)
    },
    enabled:
      context.securityContextReady &&
      authorized &&
      !!context.userId &&
      !!context.activeRoleId &&
      !!context.teamId &&
      !!context.seasonId &&
      !!context.categoryId &&
      !!playerId,
    staleTime: 15 * 1000,
  })
}

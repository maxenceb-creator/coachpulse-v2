import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export const invalidatePlayerAttendance = (
  client: QueryClient,
  context: {
    uid: string
    roleId: string
    teamId: string
    seasonId: string
    playerId: string
  },
) =>
  client.invalidateQueries({
    queryKey: queryKeys.attendance.playerSummary(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      context.playerId,
    ),
  })

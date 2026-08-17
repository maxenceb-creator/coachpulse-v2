import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testPlayerHistoryService } from '../services/appTestsService'
import { hasPermission } from '../services/permissionsService'
import type { TestHookContext } from './useTestSession'

const contextFor = (context: TestHookContext) => ({
  userId: context.uid,
  activeRoleId: context.roleId,
  teamId: context.teamId,
  seasonId: context.seasonId,
  accesses: context.accesses,
})

const enabled = (context: TestHookContext) =>
  context.securityContextReady &&
  !!context.uid &&
  !!context.roleId &&
  !!context.teamId &&
  !!context.seasonId &&
  hasPermission(context.accesses, {
    userId: context.uid,
    activeRoleId: context.roleId,
    teamId: context.teamId,
    permissionKey: 'tests.read',
  })

export const useTestPlayerRoster = (context: TestHookContext) =>
  useQuery({
    queryKey: queryKeys.tests.playerRoster(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
    ),
    queryFn: () =>
      testPlayerHistoryService.listScopedPlayers(contextFor(context)),
    enabled: enabled(context),
  })

export const useTestPlayerHistory = (
  context: TestHookContext,
  playerId: string,
) =>
  useQuery({
    queryKey: queryKeys.tests.playerHistory(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: () =>
      testPlayerHistoryService.getPlayerHistory(contextFor(context), playerId),
    enabled: enabled(context) && !!playerId,
  })

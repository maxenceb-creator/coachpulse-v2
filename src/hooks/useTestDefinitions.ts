import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsService } from '../services/appTestsService'
import type { TeamAccess } from '../types/domain'

export const useTestDefinitions = (context: {
  uid?: string
  roleId?: string
  teamId?: string
  seasonId?: string
  accesses: TeamAccess[]
  securityContextReady: boolean
}) =>
  useQuery({
    queryKey: queryKeys.tests.definitions(
      context.uid ?? '',
      context.roleId ?? '',
      context.teamId ?? '',
      context.seasonId ?? '',
    ),
    queryFn: () =>
      testsService.getActiveDefinitions({
        userId: context.uid!,
        activeRoleId: context.roleId!,
        teamId: context.teamId!,
        accesses: context.accesses,
      }),
    enabled:
      !!context.uid &&
      !!context.roleId &&
      !!context.teamId &&
      !!context.seasonId &&
      context.securityContextReady,
    staleTime: 5 * 60 * 1000,
  })

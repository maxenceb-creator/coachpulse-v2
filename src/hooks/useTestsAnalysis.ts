import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsAnalysisService } from '../services/appTestsService'
import type { TestHookContext } from './useTestSession'

export const useTestsAnalysis = (
  context: TestHookContext,
  input: {
    testDefinitionId: string
    version: number
    metricKey: string
    playerId?: string
  },
) =>
  useQuery({
    queryKey: queryKeys.tests.analysis(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      input.testDefinitionId,
      input.version,
      input.metricKey,
      input.playerId,
    ),
    queryFn: () =>
      testsAnalysisService.getDefinitionAnalysis(
        {
          userId: context.uid,
          activeRoleId: context.roleId,
          teamId: context.teamId,
          seasonId: context.seasonId,
          accesses: context.accesses,
        },
        {
          testDefinitionId: input.testDefinitionId,
          testDefinitionVersion: input.version,
          metricKey: input.metricKey,
          playerId: input.playerId,
        },
      ),
    enabled:
      context.securityContextReady &&
      !!input.testDefinitionId &&
      !!input.version &&
      !!input.metricKey,
  })

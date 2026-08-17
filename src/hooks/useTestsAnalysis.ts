import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsAnalysisService } from '../services/appTestsService'
import type { TestHookContext } from './useTestSession'
import { hasPermission } from '../services/permissionsService'
import { ZodError } from 'zod'
import { TestsDomainError } from '../services/testsService'

export const isTestsAnalysisQueryEnabled = (
  context: TestHookContext,
  input: {
    testDefinitionId: string
    version: number
    metricKey: string
  },
) =>
  context.securityContextReady &&
  !!context.uid &&
  !!context.roleId &&
  !!context.teamId &&
  !!context.seasonId &&
  !!input.testDefinitionId &&
  !!input.version &&
  !!input.metricKey &&
  hasPermission(context.accesses, {
    userId: context.uid,
    activeRoleId: context.roleId,
    teamId: context.teamId,
    permissionKey: 'tests.read',
  })

export const useTestsAnalysis = (
  context: TestHookContext,
  input: {
    testDefinitionId: string
    version: number
    metricKey: string
    playerId?: string
  },
) => {
  const enabled = isTestsAnalysisQueryEnabled(context, input)
  const queryKey = queryKeys.tests.analysis(
    context.uid,
    context.roleId,
    context.teamId,
    context.seasonId,
    input.testDefinitionId,
    input.version,
    input.metricKey,
    input.playerId,
  )
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (import.meta.env.DEV)
        console.debug('[TestAnalysis DEV] Query', {
          queryKey,
          enabled,
          constraints: {
            testSessions: [
              ['teamId', '==', context.teamId],
              ['seasonId', '==', context.seasonId],
              ['testDefinitionId', '==', input.testDefinitionId],
              ['testDefinitionVersion', '==', input.version],
              ['status', '==', 'COMPLETED'],
              ['date', 'orderBy', 'desc'],
              ['limit', 100],
            ],
            testResults: [
              ['teamId', '==', context.teamId],
              ['seasonId', '==', context.seasonId],
              ['testDefinitionId', '==', input.testDefinitionId],
              ['testDefinitionVersion', '==', input.version],
              ['limit', 500],
            ],
          },
        })
      try {
        return await testsAnalysisService.getDefinitionAnalysis(
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
        )
      } catch (error) {
        if (import.meta.env.DEV) {
          const failure = error as Error & { code?: string }
          console.error('[TestAnalysis DEV] Erreur', {
            layer:
              error instanceof ZodError
                ? 'ZOD'
                : error instanceof TestsDomainError
                  ? 'service'
                  : failure.code
                    ? 'FIRESTORE'
                    : 'repository',
            operation: 'getDefinitionAnalysis',
            collection: 'multiple',
            activeRoleId: context.roleId,
            teamId: context.teamId,
            seasonId: context.seasonId,
            testDefinitionId: input.testDefinitionId,
            playerId: input.playerId,
            securityContextReady: context.securityContextReady,
            code: failure.code ?? 'UNKNOWN',
            message: failure.message,
            zodIssues: error instanceof ZodError ? error.issues : undefined,
            error,
          })
        }
        throw error
      }
    },
    enabled,
  })
}

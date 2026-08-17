import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testPlayerHistoryService } from '../services/appTestsService'
import { buildPlayerHistory } from '../services/testPlayerHistoryService'
import { TestsDomainError } from '../services/testsService'
import { hasPermission } from '../services/permissionsService'
import type { TestHookContext } from './useTestSession'

const COMMON_STALE_TIME = 5 * 60 * 1000
const SESSIONS_STALE_TIME = 60 * 1000
const RESULTS_STALE_TIME = 15 * 1000

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
    staleTime: COMMON_STALE_TIME,
  })

export const useTestPlayerHistory = (
  context: TestHookContext,
  playerId: string,
) => {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.tests.playerHistory(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: async () => {
      const startedAt = performance.now()
      const serviceContext = contextFor(context)
      const timings: Record<string, number> = {}
      const cache: Record<string, 'hit' | 'miss'> = {}
      const timed = async <T>(
        name: string,
        queryKey: readonly unknown[],
        load: () => Promise<T>,
        staleTime: number,
      ) => {
        cache[name] =
          client.getQueryData(queryKey) === undefined ? 'miss' : 'hit'
        const start = performance.now()
        const data = await client.ensureQueryData({
          queryKey,
          queryFn: load,
          staleTime,
        })
        timings[`${name}Ms`] = performance.now() - start
        return data
      }

      const rosterKey = queryKeys.tests.playerRoster(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
      )
      const sessionsKey = queryKeys.tests.playerHistorySessions(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
      )
      const resultsKey = queryKeys.tests.playerHistoryResults(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        playerId,
      )
      const [players, sessions, results] = await Promise.all([
        timed(
          'roster',
          rosterKey,
          () => testPlayerHistoryService.listScopedPlayers(serviceContext),
          COMMON_STALE_TIME,
        ),
        timed(
          'sessions',
          sessionsKey,
          () => testPlayerHistoryService.listCompletedSessions(serviceContext),
          SESSIONS_STALE_TIME,
        ),
        timed(
          'results',
          resultsKey,
          () =>
            testPlayerHistoryService.listPlayerResults(
              serviceContext,
              playerId,
            ),
          RESULTS_STALE_TIME,
        ),
      ])
      const player = players.find((item) => item.playerId === playerId)
      if (!player) throw new TestsDomainError('PERMISSION_DENIED')
      const relevantSessionIds = new Set(
        results.map(({ testSessionId }) => testSessionId),
      )
      const categoryId =
        sessions.find(({ testSessionId }) =>
          relevantSessionIds.has(testSessionId),
        )?.categoryId ?? ''
      const taxonomyKey = queryKeys.tests.playerHistoryTaxonomy(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        categoryId,
      )
      const taxonomy = await timed(
        'taxonomy',
        taxonomyKey,
        () => testPlayerHistoryService.getTaxonomy(serviceContext, categoryId),
        COMMON_STALE_TIME,
      )
      const subCategory = taxonomy.subCategories.find(
        ({ birthYearRule }) =>
          birthYearRule === player.birthDate.getUTCFullYear(),
      )
      const definitionRefs = [
        ...new Map(
          results.map((result) => [
            result.testDefinitionId,
            {
              id: result.testDefinitionId,
              version: result.testDefinitionVersion,
            },
          ]),
        ).values(),
      ]
      const definitionsStart = performance.now()
      const definitionsPromise = Promise.all(
        definitionRefs.map(({ id, version }) =>
          timed(
            `definition:${id}`,
            queryKeys.tests.definition(
              context.uid,
              context.roleId,
              context.teamId,
              context.seasonId,
              id,
              version,
            ),
            () => testPlayerHistoryService.getDefinition(serviceContext, id),
            Number.POSITIVE_INFINITY,
          ),
        ),
      )
      const benchmarksPromise = subCategory
        ? timed(
            'benchmarks',
            queryKeys.tests.benchmarks(
              context.uid,
              context.roleId,
              context.teamId,
              context.seasonId,
              subCategory.subCategoryId,
            ),
            () =>
              testPlayerHistoryService.getBenchmarks(
                serviceContext,
                subCategory.subCategoryId,
              ),
            COMMON_STALE_TIME,
          )
        : Promise.resolve([])
      const [definitions, benchmarks] = await Promise.all([
        definitionsPromise,
        benchmarksPromise,
      ])
      timings.definitionsMs = performance.now() - definitionsStart
      const analyticsStart = performance.now()
      const history = buildPlayerHistory({
        player,
        subCategory,
        results,
        sessions,
        definitions,
        benchmarks,
      })
      timings.analyticsMs = performance.now() - analyticsStart
      if (import.meta.env.DEV)
        console.debug('[TestPlayerHistory PERF DEV]', {
          playerId,
          teamId: context.teamId,
          seasonId: context.seasonId,
          totalMs: performance.now() - startedAt,
          ...timings,
          cache,
        })
      return history
    },
    enabled: enabled(context) && !!playerId,
    staleTime: RESULTS_STALE_TIME,
  })
}

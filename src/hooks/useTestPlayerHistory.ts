import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testPlayerHistoryService } from '../services/appTestsService'
import { buildPlayerHistory } from '../services/testPlayerHistoryService'
import { TestsDomainError } from '../services/testsService'
import { hasPermission } from '../services/permissionsService'
import type { TestHookContext } from './useTestSession'
import type { Category, Player, SubCategory } from '../types/domain'

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

export const useTestPlayerRoster = (context: TestHookContext) => {
  const key = queryKeys.tests.playerRoster(
    context.uid,
    context.roleId,
    context.teamId,
    context.seasonId,
  )
  return useQuery({
    queryKey: key,
    queryFn: () =>
      testPlayerHistoryService.listScopedPlayers(contextFor(context)),
    enabled: enabled(context),
    staleTime: COMMON_STALE_TIME,
  })
}

export const useTestPlayerHistory = (
  context: TestHookContext,
  playerId: string,
  resolved?: {
    player: Player
    taxonomy?: { category: Category | null; subCategory?: SubCategory }
  },
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
      const serviceContext = contextFor(context)
      const cached = <T>(
        queryKey: readonly unknown[],
        load: () => Promise<T>,
        staleTime: number,
      ) =>
        client.ensureQueryData({
          queryKey,
          queryFn: load,
          staleTime,
          revalidateIfStale: true,
        })

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
      const rosterPromise = resolved
        ? Promise.resolve([resolved.player])
        : cached(
            rosterKey,
            () => testPlayerHistoryService.listScopedPlayers(serviceContext),
            COMMON_STALE_TIME,
          )
      const resultsPromise = resolved
        ? cached(
            resultsKey,
            () =>
              testPlayerHistoryService.listPlayerResults(
                serviceContext,
                playerId,
              ),
            RESULTS_STALE_TIME,
          )
        : undefined
      const [players, sessions, prefetchedResults] = await Promise.all([
        rosterPromise,
        cached(
          sessionsKey,
          () => testPlayerHistoryService.listCompletedSessions(serviceContext),
          SESSIONS_STALE_TIME,
        ),
        resultsPromise,
      ])
      const player = players.find((item) => item.playerId === playerId)
      if (!player) throw new TestsDomainError('PERMISSION_DENIED')
      const results =
        prefetchedResults ??
        (await cached(
          resultsKey,
          () =>
            testPlayerHistoryService.listPlayerResults(
              serviceContext,
              playerId,
            ),
          RESULTS_STALE_TIME,
        ))
      const relevantSessionIds = new Set(
        results.map(({ testSessionId }) => testSessionId),
      )
      const categoryId =
        sessions.find(({ testSessionId }) =>
          relevantSessionIds.has(testSessionId),
        )?.categoryId ??
        resolved?.taxonomy?.category?.categoryId ??
        ''
      const taxonomyKey = queryKeys.tests.playerHistoryTaxonomy(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        categoryId,
      )
      const taxonomy = resolved?.taxonomy
        ? {
            category: resolved.taxonomy.category,
            subCategories: resolved.taxonomy.subCategory
              ? [resolved.taxonomy.subCategory]
              : [],
          }
        : await cached(
            taxonomyKey,
            () =>
              testPlayerHistoryService.getTaxonomy(serviceContext, categoryId),
            COMMON_STALE_TIME,
          )
      const subCategory =
        resolved?.taxonomy?.subCategory ??
        taxonomy.subCategories.find(
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
      const definitionsPromise = Promise.all(
        definitionRefs.map(({ id, version }) =>
          cached(
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
      const benchmarksPromise =
        subCategory && definitionRefs.length
          ? cached(
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
      return buildPlayerHistory({
        player,
        subCategory,
        results,
        sessions,
        definitions,
        benchmarks,
      })
    },
    enabled: enabled(context) && !!playerId,
    staleTime: RESULTS_STALE_TIME,
  })
}

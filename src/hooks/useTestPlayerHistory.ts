import { useEffect, useRef } from 'react'
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
  const client = useQueryClient()
  const key = queryKeys.tests.playerRoster(
    context.uid,
    context.roleId,
    context.teamId,
    context.seasonId,
  )
  const loggedKey = useRef('')
  const finishedKey = useRef('')
  const startedAt = useRef(performance.now())
  useEffect(() => {
    const serialized = JSON.stringify(key)
    if (!import.meta.env.DEV || loggedKey.current === serialized) return
    loggedKey.current = serialized
    finishedKey.current = ''
    startedAt.current = performance.now()
    console.debug('[PlayerRoster PERF DEV]', {
      step: 'start',
      cache: client.getQueryData(key) === undefined ? 'miss' : 'hit',
      teamId: context.teamId,
      roleId: context.roleId,
      seasonId: context.seasonId,
      enabled: enabled(context),
    })
  }, [client, context, key])
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const startedAt = performance.now()
      if (import.meta.env.DEV)
        console.debug('[PlayerRoster PERF DEV]', {
          step: 'Firestore start',
          source: 'test-player-history',
          teamId: context.teamId,
        })
      try {
        const players = await testPlayerHistoryService.listScopedPlayers(
          contextFor(context),
        )
        if (import.meta.env.DEV)
          console.debug('[PlayerRoster PERF DEV]', {
            step: 'Firestore success',
            source: 'test-player-history',
            count: players.length,
            totalMs: performance.now() - startedAt,
          })
        return players
      } catch (error) {
        if (import.meta.env.DEV)
          console.error('[PlayerRoster PERF DEV]', {
            step: 'Firestore error',
            source: 'test-player-history',
            totalMs: performance.now() - startedAt,
            error,
          })
        throw error
      }
    },
    enabled: enabled(context),
    staleTime: COMMON_STALE_TIME,
  })
  useEffect(() => {
    const serialized = JSON.stringify(key)
    if (
      !import.meta.env.DEV ||
      finishedKey.current === serialized ||
      (!query.isSuccess && !query.isError)
    )
      return
    finishedKey.current = serialized
    console.debug('[PlayerRoster PERF DEV]', {
      step: 'end',
      status: query.isSuccess ? 'success' : 'error',
      count: query.data?.length,
      totalMs: performance.now() - startedAt.current,
      teamId: context.teamId,
    })
  }, [context.teamId, key, query.data, query.isError, query.isSuccess])
  return query
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
          revalidateIfStale: true,
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
      const rosterPromise = resolved
        ? Promise.resolve([resolved.player])
        : timed(
            'roster',
            rosterKey,
            () => testPlayerHistoryService.listScopedPlayers(serviceContext),
            COMMON_STALE_TIME,
          )
      if (resolved) cache.roster = 'hit'
      const resultsPromise = resolved
        ? timed(
            'results',
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
        timed(
          'sessions',
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
        (await timed(
          'results',
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
        : await timed(
            'taxonomy',
            taxonomyKey,
            () =>
              testPlayerHistoryService.getTaxonomy(serviceContext, categoryId),
            COMMON_STALE_TIME,
          )
      if (resolved?.taxonomy) cache.taxonomy = 'hit'
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
      const benchmarksPromise =
        subCategory && definitionRefs.length
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

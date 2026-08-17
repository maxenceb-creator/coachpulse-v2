import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { TestBenchmark, TestResult, TestSession } from '../types/domain'

export type TestPlayerHistoryCacheContext = {
  uid: string
  roleId: string
  teamId: string
  seasonId: string
}

type Invalidation = {
  playerIds?: string[]
  sessions?: boolean
  benchmarks?: boolean
}

const matchesContext = (
  queryKey: QueryKey,
  context: TestPlayerHistoryCacheContext,
) =>
  queryKey[2] === context.uid &&
  queryKey[3] === context.roleId &&
  queryKey[4] === context.teamId &&
  queryKey[5] === context.seasonId

const matchesLegacyContext = (
  queryKey: QueryKey,
  context: TestPlayerHistoryCacheContext,
) =>
  queryKey[1] === context.uid &&
  queryKey[2] === context.roleId &&
  queryKey[3] === context.teamId &&
  queryKey[4] === context.seasonId

const upsertById = <T>(items: T[], updates: T[], id: (item: T) => string) => {
  const updatedIds = new Set(updates.map(id))
  return [...items.filter((item) => !updatedIds.has(id(item))), ...updates]
}

export const updateTestPlayerHistoryResults = (
  client: QueryClient,
  context: TestPlayerHistoryCacheContext,
  results: TestResult[],
) => {
  const byPlayer = new Map<string, TestResult[]>()
  for (const result of results)
    byPlayer.set(result.playerId, [
      ...(byPlayer.get(result.playerId) ?? []),
      result,
    ])
  for (const [playerId, playerResults] of byPlayer)
    client.setQueryData<TestResult[]>(
      [
        'tests',
        'playerHistoryResults',
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        playerId,
      ],
      (current) =>
        current
          ? upsertById(
              current,
              playerResults,
              ({ testResultId }) => testResultId,
            )
          : current,
    )
}

export const completeTestPlayerHistorySession = (
  client: QueryClient,
  context: TestPlayerHistoryCacheContext,
  session: TestSession,
) =>
  client.setQueryData<TestSession[]>(
    [
      'tests',
      'playerHistorySessions',
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
    ],
    (current) =>
      current
        ? upsertById(current, [session], ({ testSessionId }) => testSessionId)
        : current,
  )

export const removeTestPlayerHistorySession = (
  client: QueryClient,
  context: TestPlayerHistoryCacheContext,
  testSessionId: string,
) => {
  client.setQueryData<TestSession[]>(
    [
      'tests',
      'playerHistorySessions',
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
    ],
    (current) =>
      current?.filter((session) => session.testSessionId !== testSessionId),
  )
  client.setQueriesData<TestResult[]>(
    {
      predicate: ({ queryKey }) =>
        queryKey[0] === 'tests' &&
        queryKey[1] === 'playerHistoryResults' &&
        matchesContext(queryKey, context),
    },
    (current) =>
      current?.filter((result) => result.testSessionId !== testSessionId),
  )
}

export const updateTestPlayerHistoryBenchmark = (
  client: QueryClient,
  context: TestPlayerHistoryCacheContext,
  operation: 'create' | 'update' | 'archive' | 'delete',
  benchmarkId: string,
  benchmark?: TestBenchmark,
) =>
  client.setQueriesData<TestBenchmark[]>(
    {
      predicate: ({ queryKey }) =>
        queryKey[0] === 'testBenchmarks' &&
        matchesLegacyContext(queryKey, context) &&
        (!benchmark || queryKey[5] === benchmark.subCategoryId) &&
        (!benchmark ||
          queryKey[6] === 'all' ||
          queryKey[6] === benchmark.testDefinitionId),
    },
    (current) => {
      if (!current) return current
      const withoutCurrent = current.filter(
        ({ testBenchmarkId }) => testBenchmarkId !== benchmarkId,
      )
      return benchmark &&
        benchmark.status === 'ACTIVE' &&
        operation !== 'archive' &&
        operation !== 'delete'
        ? [...withoutCurrent, benchmark]
        : withoutCurrent
    },
  )

export const invalidateTestPlayerHistory = (
  client: QueryClient,
  context: TestPlayerHistoryCacheContext,
  invalidation: Invalidation,
) => {
  const playerIds = new Set(invalidation.playerIds ?? [])
  const invalidatePlayerData = invalidation.playerIds !== undefined
  const invalidateAllPlayers = invalidatePlayerData && playerIds.size === 0
  return client.invalidateQueries({
    predicate: ({ queryKey }) => {
      if (queryKey[0] === 'testBenchmarks')
        return (
          !!invalidation.benchmarks && matchesLegacyContext(queryKey, context)
        )
      if (queryKey[0] !== 'tests' || !matchesContext(queryKey, context))
        return false
      const family = queryKey[1]
      if (family === 'playerHistorySessions') return !!invalidation.sessions
      if (family === 'playerHistoryResults')
        return (
          invalidateAllPlayers ||
          (invalidatePlayerData && playerIds.has(String(queryKey[6])))
        )
      if (family === 'playerHistory')
        return (
          !!invalidation.sessions ||
          !!invalidation.benchmarks ||
          invalidateAllPlayers ||
          (invalidatePlayerData && playerIds.has(String(queryKey[6])))
        )
      return false
    },
  })
}

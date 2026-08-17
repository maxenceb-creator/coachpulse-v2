import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'
import type { TestBenchmark, TestResult, TestSession } from '../types/domain'
import {
  completeTestPlayerHistorySession,
  invalidateTestPlayerHistory,
  removeTestPlayerHistorySession,
  updateTestPlayerHistoryBenchmark,
  updateTestPlayerHistoryResults,
} from './testPlayerHistoryCache'

const context = {
  uid: 'user',
  roleId: 'coach',
  teamId: 'u13',
  seasonId: '2026',
}
const keys = (teamId = 'u13') => ({
  alice: queryKeys.tests.playerHistory(
    'user',
    'coach',
    teamId,
    '2026',
    'alice',
  ),
  emma: queryKeys.tests.playerHistory('user', 'coach', teamId, '2026', 'emma'),
  aliceResults: queryKeys.tests.playerHistoryResults(
    'user',
    'coach',
    teamId,
    '2026',
    'alice',
  ),
  emmaResults: queryKeys.tests.playerHistoryResults(
    'user',
    'coach',
    teamId,
    '2026',
    'emma',
  ),
  sessions: queryKeys.tests.playerHistorySessions(
    'user',
    'coach',
    teamId,
    '2026',
  ),
  benchmarks: queryKeys.tests.benchmarks(
    'user',
    'coach',
    teamId,
    '2026',
    'u13',
  ),
})

const seed = (client: QueryClient, teamId = 'u13') => {
  Object.values(keys(teamId)).forEach((key) =>
    client.setQueryData(key, ['cached']),
  )
}

describe('invalidation cache historique joueuse', () => {
  it('invalide immédiatement uniquement la joueuse modifiée et les sessions finalisées', async () => {
    const client = new QueryClient()
    seed(client)
    seed(client, 'u14')

    await invalidateTestPlayerHistory(client, context, {
      playerIds: ['alice'],
      sessions: true,
    })

    expect(client.getQueryState(keys().alice)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys().aliceResults)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys().sessions)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys().emmaResults)?.isInvalidated).toBe(false)
    expect(client.getQueryState(keys('u14').alice)?.isInvalidated).toBe(false)
  })

  it('invalide les benchmarks et toutes les comparaisons du contexte seulement', async () => {
    const client = new QueryClient()
    seed(client)
    seed(client, 'u14')

    await invalidateTestPlayerHistory(client, context, { benchmarks: true })

    expect(client.getQueryState(keys().benchmarks)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys().alice)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys().emma)?.isInvalidated).toBe(true)
    expect(client.getQueryState(keys('u14').benchmarks)?.isInvalidated).toBe(
      false,
    )
  })

  it('force la prochaine lecture à récupérer la valeur actualisée', async () => {
    const client = new QueryClient()
    const key = keys().alice
    client.setQueryData(key, ['ancienne'])
    await invalidateTestPlayerHistory(client, context, { playerIds: ['alice'] })

    const value = await client.fetchQuery({
      queryKey: key,
      queryFn: async () => ['nouvelle'],
      staleTime: 60_000,
    })
    expect(value).toEqual(['nouvelle'])
  })

  it('met à jour les feuilles résultats et sessions sans remount', () => {
    const client = new QueryClient()
    const aliceResults = keys().aliceResults
    const sessions = keys().sessions
    client.setQueryData<TestResult[]>(aliceResults, [
      {
        testResultId: 'result',
        values: { TIME: 3.7 },
      } as unknown as TestResult,
    ])
    client.setQueryData<TestSession[]>(sessions, [])
    const updated = {
      testResultId: 'result',
      playerId: 'alice',
      values: { TIME: 3.5 },
    } as unknown as TestResult
    const completed = {
      testSessionId: 'session',
      status: 'COMPLETED',
    } as TestSession

    updateTestPlayerHistoryResults(client, context, [updated])
    completeTestPlayerHistorySession(client, context, completed)

    expect(client.getQueryData<TestResult[]>(aliceResults)?.[0].values).toEqual(
      { TIME: 3.5 },
    )
    expect(client.getQueryData<TestSession[]>(sessions)).toEqual([completed])
  })

  it('retire immédiatement une session et ses résultats de toutes les joueuses du contexte', () => {
    const client = new QueryClient()
    client.setQueryData<TestSession[]>(keys().sessions, [
      { testSessionId: 'deleted' } as TestSession,
      { testSessionId: 'kept' } as TestSession,
    ])
    for (const key of [keys().aliceResults, keys().emmaResults])
      client.setQueryData<TestResult[]>(key, [
        { testResultId: 'old', testSessionId: 'deleted' } as TestResult,
        { testResultId: 'new', testSessionId: 'kept' } as TestResult,
      ])

    removeTestPlayerHistorySession(client, context, 'deleted')

    expect(client.getQueryData<TestSession[]>(keys().sessions)).toHaveLength(1)
    expect(client.getQueryData<TestResult[]>(keys().aliceResults)).toHaveLength(
      1,
    )
    expect(client.getQueryData<TestResult[]>(keys().emmaResults)).toHaveLength(
      1,
    )
  })

  it('réconcilie immédiatement create/update/archive/delete d’un benchmark actif', () => {
    const client = new QueryClient()
    const key = keys().benchmarks
    client.setQueryData<TestBenchmark[]>(key, [])
    const benchmark = {
      testBenchmarkId: 'benchmark',
      subCategoryId: 'u13',
      testDefinitionId: 'sprint',
      status: 'ACTIVE',
      targetValue: 3.7,
    } as TestBenchmark

    updateTestPlayerHistoryBenchmark(
      client,
      context,
      'create',
      benchmark.testBenchmarkId,
      benchmark,
    )
    expect(client.getQueryData<TestBenchmark[]>(key)?.[0].targetValue).toBe(3.7)

    updateTestPlayerHistoryBenchmark(
      client,
      context,
      'update',
      benchmark.testBenchmarkId,
      { ...benchmark, targetValue: 3.5 },
    )
    expect(client.getQueryData<TestBenchmark[]>(key)?.[0].targetValue).toBe(3.5)

    updateTestPlayerHistoryBenchmark(
      client,
      context,
      'archive',
      benchmark.testBenchmarkId,
      { ...benchmark, status: 'ARCHIVED' },
    )
    expect(client.getQueryData<TestBenchmark[]>(key)).toEqual([])

    client.setQueryData(key, [benchmark])
    updateTestPlayerHistoryBenchmark(
      client,
      context,
      'delete',
      benchmark.testBenchmarkId,
    )
    expect(client.getQueryData<TestBenchmark[]>(key)).toEqual([])
  })
})

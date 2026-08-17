import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'
import { invalidateTestPlayerHistory } from './testPlayerHistoryCache'

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
})

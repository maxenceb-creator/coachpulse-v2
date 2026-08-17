import type { QueryClient, QueryKey } from '@tanstack/react-query'

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

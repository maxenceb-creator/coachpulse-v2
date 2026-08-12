import type { Query, QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export const CACHE_SCHEMA_VERSION = '1'
export const CACHE_SCHEMA_STORAGE_KEY = 'coachpulse:cache-schema-version'

const LOCAL_CONTEXT_KEYS = [
  'coachpulse:active-role-id',
  'coachpulse:active-team-id',
  'coachpulse:active-season-id',
] as const

const isPrivateQuery = () => true

const removeMatchingQueries = async (
  client: QueryClient,
  predicate: (query: Query) => boolean,
) => {
  await client.cancelQueries({ predicate })
  client.removeQueries({ predicate })
}

export const clearPrivateQueries = (client: QueryClient) =>
  removeMatchingQueries(client, isPrivateQuery)

export const clearLocalUserContext = (storage?: Storage) => {
  if (!storage) return
  for (const key of LOCAL_CONTEXT_KEYS) storage.removeItem(key)
}

export const initializeCacheSchema = (
  client: QueryClient,
  storage?: Storage,
) => {
  if (!storage) return false
  const currentVersion = storage.getItem(CACHE_SCHEMA_STORAGE_KEY)
  if (currentVersion === CACHE_SCHEMA_VERSION) return false

  client.removeQueries({ predicate: isPrivateQuery })
  clearLocalUserContext(storage)
  storage.setItem(CACHE_SCHEMA_STORAGE_KEY, CACHE_SCHEMA_VERSION)
  return true
}

const startsWith = (queryKey: QueryKey, prefix: QueryKey) =>
  prefix.every((value, index) => queryKey[index] === value)

const protectedContext = (queryKey: QueryKey) => {
  if (queryKey[0] === 'assignments') {
    return {
      uid: queryKey[1],
      roleId: queryKey[2],
      teamId: queryKey[3],
      seasonId: queryKey[4],
    }
  }
  if (queryKey[0] === 'players') {
    return {
      uid: queryKey[2],
      roleId: queryKey[3],
      teamId: queryKey[4],
      seasonId: queryKey[5],
    }
  }
  if (queryKey[0] === 'testDefinitions' || queryKey[0] === 'testBenchmarks') {
    return {
      uid: queryKey[1],
      roleId: queryKey[2],
      teamId: queryKey[3],
      seasonId: queryKey[4],
    }
  }
  return undefined
}

export const removeRoleScopedQueries = (
  client: QueryClient,
  uid: string,
  roleId: string,
) =>
  removeMatchingQueries(client, ({ queryKey }) => {
    const context = protectedContext(queryKey)
    return (
      startsWith(queryKey, queryKeys.teams(uid, roleId)) ||
      (context?.uid === uid && context.roleId === roleId)
    )
  })

export const removeTeamScopedQueries = (
  client: QueryClient,
  uid: string,
  roleId: string,
  teamId: string,
) =>
  removeMatchingQueries(client, ({ queryKey }) => {
    const context = protectedContext(queryKey)
    return (
      context?.uid === uid &&
      context.roleId === roleId &&
      context.teamId === teamId
    )
  })

export const removeProtectedQueriesExcept = (
  client: QueryClient,
  context: {
    uid: string
    roleId: string
    teamId: string
    seasonId: string
  },
) =>
  removeMatchingQueries(client, ({ queryKey }) => {
    const current = protectedContext(queryKey)
    if (!current) return false
    return !(
      current.uid === context.uid &&
      current.roleId === context.roleId &&
      current.teamId === context.teamId &&
      current.seasonId === context.seasonId
    )
  })

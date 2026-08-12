import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CACHE_SCHEMA_STORAGE_KEY,
  CACHE_SCHEMA_VERSION,
  clearPrivateQueries,
  initializeCacheSchema,
  removeProtectedQueriesExcept,
  removeRoleScopedQueries,
  removeTeamScopedQueries,
} from './cacheLifecycle'
import { queryKeys } from './queryKeys'

describe('cycle de vie du cache privé', () => {
  let client: QueryClient

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    window.localStorage.clear()
  })

  it('charge User A dans une clé isolée de User B', () => {
    client.setQueryData(queryKeys.user('user-a'), { firstName: 'A' })

    expect(client.getQueryData(queryKeys.user('user-a'))).toEqual({
      firstName: 'A',
    })
    expect(client.getQueryData(queryKeys.user('user-b'))).toBeUndefined()
  })

  it('supprime au logout toutes les queries, aucune famille n’étant publique', async () => {
    client.setQueryData(queryKeys.user('user-a'), { firstName: 'A' })
    client.setQueryData(queryKeys.teamAccess('user-a'), ['u13'])
    client.setQueryData(queryKeys.season, { seasonId: '2026' })

    await clearPrivateQueries(client)

    expect(client.getQueryData(queryKeys.user('user-a'))).toBeUndefined()
    expect(client.getQueryData(queryKeys.teamAccess('user-a'))).toBeUndefined()
    expect(client.getQueryData(queryKeys.season)).toBeUndefined()
  })

  it('ne rend aucune donnée User A disponible après le passage à User B', async () => {
    client.setQueryData(queryKeys.user('user-a'), { firstName: 'A' })
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      2,
    )

    await clearPrivateQueries(client)
    client.setQueryData(queryKeys.user('user-b'), { firstName: 'B' })

    expect(client.getQueryData(queryKeys.user('user-a'))).toBeUndefined()
    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      ),
    ).toBeUndefined()
    expect(client.getQueryData(queryKeys.user('user-b'))).toEqual({
      firstName: 'B',
    })
  })

  it('retire les anciennes queries Players et Teams lors du changement de rôle', async () => {
    client.setQueryData(queryKeys.teams('user-a', 'coach'), ['u13'])
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      2,
    )
    client.setQueryData(
      queryKeys.players.count('user-a', 'analyst', 'u13', '2026'),
      1,
    )

    await removeRoleScopedQueries(client, 'user-a', 'coach')

    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      ),
    ).toBeUndefined()
    expect(
      client.getQueryData(queryKeys.teams('user-a', 'coach')),
    ).toBeUndefined()
    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'analyst', 'u13', '2026'),
      ),
    ).toBe(1)
  })

  it('retire U13 sans toucher U14 lors du changement de Team', async () => {
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      2,
    )
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u14', '2026'),
      3,
    )

    await removeTeamScopedQueries(client, 'user-a', 'coach', 'u13')

    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      ),
    ).toBeUndefined()
    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u14', '2026'),
      ),
    ).toBe(3)
  })

  it('retire tout contexte protégé différent du securityContext confirmé', async () => {
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      2,
    )
    client.setQueryData(
      queryKeys.players.count('user-a', 'coach', 'u14', '2026'),
      3,
    )

    await removeProtectedQueriesExcept(client, {
      uid: 'user-a',
      roleId: 'coach',
      teamId: 'u14',
      seasonId: '2026',
    })

    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u13', '2026'),
      ),
    ).toBeUndefined()
    expect(
      client.getQueryData(
        queryKeys.players.count('user-a', 'coach', 'u14', '2026'),
      ),
    ).toBe(3)
  })

  it('purge une seule fois un ancien schéma local incompatible', () => {
    window.localStorage.setItem(CACHE_SCHEMA_STORAGE_KEY, 'legacy')
    window.localStorage.setItem('coachpulse:active-team-id', 'u13')
    client.setQueryData(queryKeys.user('user-a'), { firstName: 'A' })

    expect(initializeCacheSchema(client, window.localStorage)).toBe(true)
    expect(client.getQueryData(queryKeys.user('user-a'))).toBeUndefined()
    expect(window.localStorage.getItem('coachpulse:active-team-id')).toBeNull()
    expect(window.localStorage.getItem(CACHE_SCHEMA_STORAGE_KEY)).toBe(
      CACHE_SCHEMA_VERSION,
    )
    expect(initializeCacheSchema(client, window.localStorage)).toBe(false)
  })
})

describe('query keys privées', () => {
  it('isolent user, rôle, Team et saison', () => {
    const base = queryKeys.players.count('user-a', 'coach', 'u13', '2026')

    expect(
      queryKeys.players.count('user-b', 'coach', 'u13', '2026'),
    ).not.toEqual(base)
    expect(
      queryKeys.players.count('user-a', 'analyst', 'u13', '2026'),
    ).not.toEqual(base)
    expect(
      queryKeys.players.count('user-a', 'coach', 'u14', '2026'),
    ).not.toEqual(base)
    expect(
      queryKeys.players.count('user-a', 'coach', 'u13', '2027'),
    ).not.toEqual(base)
  })
  it('isole la liste Teams quand les TeamAccess effectifs changent', () => {
    expect(queryKeys.teams('user-a', 'coach', ['u13'])).not.toEqual(
      queryKeys.teams('user-a', 'coach', ['u13', 'u14']),
    )
  })
})

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

  it('retire les définitions et benchmarks Tests du contexte quitté', async () => {
    const u13Definitions = queryKeys.tests.definitions(
      'user-a',
      'coach',
      'u13',
      '2026',
    )
    const u13Benchmarks = queryKeys.tests.benchmarks(
      'user-a',
      'coach',
      'u13',
      '2026',
      'subcat-u13',
    )
    const u14Definitions = queryKeys.tests.definitions(
      'user-a',
      'coach',
      'u14',
      '2026',
    )
    client.setQueryData(u13Definitions, ['jongles'])
    client.setQueryData(u13Benchmarks, [50])
    client.setQueryData(u14Definitions, ['sprint'])

    await removeTeamScopedQueries(client, 'user-a', 'coach', 'u13')

    expect(client.getQueryData(u13Definitions)).toBeUndefined()
    expect(client.getQueryData(u13Benchmarks)).toBeUndefined()
    expect(client.getQueryData(u14Definitions)).toEqual(['sprint'])
  })

  it('retire sessions, résultats, analyses et caches admin de la Team quittée', async () => {
    const keys = [
      queryKeys.tests.sessions('user-a', 'coach', 'u13', '2026'),
      queryKeys.tests.session('user-a', 'coach', 'u13', '2026', 'session'),
      queryKeys.tests.results('user-a', 'coach', 'u13', '2026', 'session'),
      queryKeys.tests.analysisRoot('user-a', 'coach', 'u13', '2026'),
      queryKeys.tests.catalogue('user-a', 'coach', 'u13', '2026'),
      queryKeys.tests.definitionAdmin(
        'user-a',
        'coach',
        'u13',
        '2026',
        'definition',
      ),
      queryKeys.tests.benchmarksAdmin(
        'user-a',
        'coach',
        'u13',
        '2026',
        'definition',
        1,
      ),
    ]
    keys.forEach((key) => client.setQueryData(key, ['private']))

    await removeTeamScopedQueries(client, 'user-a', 'coach', 'u13')

    keys.forEach((key) => expect(client.getQueryData(key)).toBeUndefined())
  })

  it('retire roster et historique joueuse lors du changement de Team', async () => {
    const u13Roster = queryKeys.tests.playerRoster(
      'user-a',
      'coach',
      'u13',
      '2026',
    )
    const u13History = queryKeys.tests.playerHistory(
      'user-a',
      'coach',
      'u13',
      '2026',
      'alice',
    )
    const u14History = queryKeys.tests.playerHistory(
      'user-a',
      'coach',
      'u14',
      '2026',
      'lina',
    )
    const u13Profile = queryKeys.players.profile(
      'user-a',
      'coach',
      'u13',
      '2026',
      'alice',
    )
    const u14Profile = queryKeys.players.profile(
      'user-a',
      'coach',
      'u14',
      '2026',
      'lina',
    )
    client.setQueryData(u13Roster, ['alice'])
    client.setQueryData(u13History, [32, 35, 38])
    client.setQueryData(u14History, [40])
    client.setQueryData(u13Profile, { playerId: 'alice' })
    client.setQueryData(u14Profile, { playerId: 'lina' })

    await removeTeamScopedQueries(client, 'user-a', 'coach', 'u13')

    expect(client.getQueryData(u13Roster)).toBeUndefined()
    expect(client.getQueryData(u13History)).toBeUndefined()
    expect(client.getQueryData(u14History)).toEqual([40])
    expect(client.getQueryData(u13Profile)).toBeUndefined()
    expect(client.getQueryData(u14Profile)).toEqual({ playerId: 'lina' })
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
  it('isole Tests par contexte et benchmarks par sous-catégorie', () => {
    const base = queryKeys.tests.definitions('user-a', 'coach', 'u13', '2026')
    expect(
      queryKeys.tests.definition(
        'user-a',
        'coach',
        'u13',
        '2026',
        'juggling',
        1,
      ),
    ).not.toEqual(base)
    expect(
      queryKeys.tests.definitions('user-a', 'coach', 'u14', '2026'),
    ).not.toEqual(base)
    expect(
      queryKeys.tests.benchmarks(
        'user-a',
        'coach',
        'u13',
        '2026',
        'subcat-u13',
      ),
    ).not.toEqual(
      queryKeys.tests.benchmarks(
        'user-a',
        'coach',
        'u13',
        '2026',
        'subcat-u14',
      ),
    )
  })
})

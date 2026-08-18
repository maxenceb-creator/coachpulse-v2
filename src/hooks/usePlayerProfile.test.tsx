import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../query/queryKeys'
import { playersService } from '../services/playersService'
import type { PlayerProfileHookContext } from './usePlayerProfile'
import { usePlayerProfile } from './usePlayerProfile'

vi.mock('../services/playersService', () => ({
  playersService: {
    listScopedPlayers: vi.fn(),
    getProfileIdentity: vi.fn(),
    getProfileTaxonomy: vi.fn(),
  },
}))

const alice = {
  playerId: 'alice',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2013-01-01T00:00:00.000Z'),
  playerProfile: 'MIDFIELDER' as const,
  preferredFoot: 'RIGHT' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const lina = {
  ...alice,
  playerId: 'lina',
  firstName: 'Lina',
  birthDate: new Date('2013-01-01T00:00:00.000Z'),
}
const context = (teamId = 'team-a'): PlayerProfileHookContext => ({
  userId: 'user-a',
  activeRoleId: 'coach',
  teamId,
  seasonId: 'season-a',
  accesses: [],
  categoryId: `category-${teamId}`,
  securityContextReady: true,
})

describe('usePlayerProfile — cache roster partagé', () => {
  let client: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(playersService.listScopedPlayers).mockResolvedValue([alice])
    vi.mocked(playersService.getProfileIdentity).mockReturnValue({
      player: alice,
      rosterCount: 1,
    })
  })

  it('charge le roster une fois sur cache froid sans refetch en boucle', async () => {
    const { result, rerender } = renderHook(
      () => usePlayerProfile(context(), 'alice'),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender()
    expect(playersService.listScopedPlayers).toHaveBeenCalledTimes(1)
    expect(playersService.getProfileIdentity).toHaveBeenCalledTimes(1)
  })

  it('réutilise immédiatement le roster PR10 déjà chaud', async () => {
    client.setQueryData(
      queryKeys.tests.playerRoster('user-a', 'coach', 'team-a', 'season-a'),
      [alice],
    )
    const { result } = renderHook(() => usePlayerProfile(context(), 'alice'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(playersService.listScopedPlayers).not.toHaveBeenCalled()
    expect(playersService.getProfileIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-a' }),
      'alice',
      [alice],
    )
  })

  it('isole les rosters U13F et U14F dans les deux sens', async () => {
    vi.mocked(playersService.listScopedPlayers).mockImplementation(
      async ({ teamId }) => (teamId === 'team-a' ? [alice] : [lina]),
    )
    vi.mocked(playersService.getProfileIdentity).mockImplementation(
      (_context, playerId, roster) => ({
        player: roster.find((player) => player.playerId === playerId)!,
        rosterCount: roster.length,
      }),
    )
    const { result, rerender } = renderHook(
      ({ teamId, playerId }) => usePlayerProfile(context(teamId), playerId),
      { initialProps: { teamId: 'team-a', playerId: 'alice' }, wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.player.playerId).toBe('alice')
    rerender({ teamId: 'team-b', playerId: 'lina' })
    await waitFor(() =>
      expect(result.current.data?.player.playerId).toBe('lina'),
    )
    rerender({ teamId: 'team-a', playerId: 'alice' })
    await waitFor(() =>
      expect(result.current.data?.player.playerId).toBe('alice'),
    )
    expect(playersService.listScopedPlayers).toHaveBeenCalledTimes(2)
    expect(
      client.getQueryData(
        queryKeys.players.roster('user-a', 'coach', 'team-a', 'season-a'),
      ),
    ).toEqual([alice])
    expect(
      client.getQueryData(
        queryKeys.players.roster('user-a', 'coach', 'team-b', 'season-a'),
      ),
    ).toEqual([lina])
  })
})

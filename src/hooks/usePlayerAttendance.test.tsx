import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../query/queryKeys'
import { playerAttendanceService } from '../services/playerAttendanceService'
import { playersService } from '../services/playersService'
import type { PlayerAttendanceHookContext } from './usePlayerAttendance'
import { usePlayerAttendance } from './usePlayerAttendance'

vi.mock('../services/playerAttendanceService', async (load) => {
  const actual =
    await load<typeof import('../services/playerAttendanceService')>()
  return { ...actual, playerAttendanceService: { getPlayerSummary: vi.fn() } }
})
vi.mock('../services/playersService', () => ({
  playersService: { listScopedPlayers: vi.fn() },
}))

const player = { playerId: 'player-a' }
const context = (
  teamId = 'team-a',
  seasonId = 'season-a',
): PlayerAttendanceHookContext => ({
  userId: 'user-a',
  activeRoleId: 'coach',
  teamId,
  seasonId,
  categoryId: `category-${teamId}`,
  securityContextReady: true,
  accesses: [
    {
      userTeamAccessId: `user-a_${teamId}`,
      userId: 'user-a',
      teamId,
      status: 'ACTIVE',
      rolePermissions: {
        coach: { permissions: ['attendance.read'], medicalAccessLevel: 'NONE' },
      },
    },
  ],
})

describe('usePlayerAttendance', () => {
  let client: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(playersService.listScopedPlayers).mockResolvedValue([
      player,
    ] as never)
    vi.mocked(playerAttendanceService.getPlayerSummary).mockResolvedValue({
      sessionsConcerned: 1,
      attendanceRate: 100,
    } as never)
  })

  it('réutilise le roster chaud et la synthèse chaude', async () => {
    client.setQueryData(
      queryKeys.players.roster('user-a', 'coach', 'team-a', 'season-a'),
      [player],
    )
    const summaryKey = queryKeys.attendance.playerSummary(
      'user-a',
      'coach',
      'team-a',
      'season-a',
      'player-a',
    )
    client.setQueryData(summaryKey, {
      sessionsConcerned: 2,
      attendanceRate: 50,
    })
    const { result } = renderHook(
      () => usePlayerAttendance(context(), 'player-a'),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.attendanceRate).toBe(50)
    expect(playersService.listScopedPlayers).not.toHaveBeenCalled()
    expect(playerAttendanceService.getPlayerSummary).not.toHaveBeenCalled()
  })

  it('isole Team et saison lors des changements rapides de contexte', async () => {
    vi.mocked(playerAttendanceService.getPlayerSummary).mockImplementation(
      async ({ teamId, seasonId }) =>
        ({
          sessionsConcerned: 1,
          attendanceRate:
            teamId === 'team-a' && seasonId === 'season-a' ? 25 : 75,
        }) as never,
    )
    const { result, rerender } = renderHook(
      ({ teamId, seasonId }) =>
        usePlayerAttendance(context(teamId, seasonId), 'player-a'),
      { initialProps: { teamId: 'team-a', seasonId: 'season-a' }, wrapper },
    )
    rerender({ teamId: 'team-b', seasonId: 'season-b' })
    await waitFor(() => expect(result.current.data?.attendanceRate).toBe(75))
    expect(
      client.getQueryData(
        queryKeys.attendance.playerSummary(
          'user-a',
          'coach',
          'team-a',
          'season-a',
          'player-a',
        ),
      ),
    ).not.toEqual({ sessionsConcerned: 1, attendanceRate: 75 })
  })
})

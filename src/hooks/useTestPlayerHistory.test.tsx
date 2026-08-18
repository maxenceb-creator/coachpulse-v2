import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamAccess, TestResult, TestSession } from '../types/domain'
import type { TestHookContext } from './useTestSession'
import {
  invalidateTestPlayerHistory,
  updateTestPlayerHistoryResults,
} from '../query/testPlayerHistoryCache'

const mocks = vi.hoisted(() => ({
  listScopedPlayers: vi.fn(),
  listCompletedSessions: vi.fn(),
  listPlayerResults: vi.fn(),
  getTaxonomy: vi.fn(),
  getDefinition: vi.fn(),
  getBenchmarks: vi.fn(),
}))

vi.mock('../services/appTestsService', () => ({
  testPlayerHistoryService: mocks,
}))

import { useTestPlayerHistory } from './useTestPlayerHistory'

const date = new Date('2026-08-12T12:00:00Z')
const access = (teamId: string): TeamAccess => ({
  userTeamAccessId: `access-${teamId}`,
  userId: 'coach',
  teamId,
  status: 'ACTIVE',
  rolePermissions: {
    coach: { permissions: ['tests.read'], medicalAccessLevel: 'NONE' },
  },
})
const context = (teamId: string): TestHookContext => ({
  uid: 'coach',
  roleId: 'coach',
  teamId,
  seasonId: 'season',
  accesses: [access(teamId)],
  securityContextReady: true,
})
const session = (teamId: string): TestSession => ({
  testSessionId: `session-${teamId}`,
  testDefinitionId: 'jump-v1',
  testDefinitionVersion: 1,
  teamId,
  seasonId: 'season',
  categoryId: `category-${teamId}`,
  date,
  status: 'COMPLETED',
  createdBy: 'coach',
  createdAt: date,
  updatedAt: date,
})
const result = (playerId: string, teamId: string): TestResult => ({
  testResultId: `${teamId}-${playerId}`,
  testSessionId: `session-${teamId}`,
  testDefinitionId: 'jump-v1',
  testDefinitionVersion: 1,
  playerId,
  teamId,
  seasonId: 'season',
  values: { HEIGHT: playerId === 'alice' ? 38 : 35 },
  contextSnapshot: { preferredFoot: 'RIGHT' },
  createdBy: 'coach',
  createdAt: date,
  updatedAt: date,
})

describe('useTestPlayerHistory cache performance', () => {
  let client: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.listScopedPlayers.mockResolvedValue([
      {
        playerId: 'alice',
        firstName: 'Alice',
        lastName: 'Martin',
        birthDate: new Date('2014-01-01'),
        status: 'ACTIVE',
      },
      {
        playerId: 'emma',
        firstName: 'Emma',
        lastName: 'Bernard',
        birthDate: new Date('2014-02-01'),
        status: 'ACTIVE',
      },
    ])
    mocks.listCompletedSessions.mockImplementation(async ({ teamId }) => [
      session(teamId),
    ])
    mocks.listPlayerResults.mockImplementation(async ({ teamId }, playerId) => [
      result(playerId, teamId),
    ])
    mocks.getTaxonomy.mockResolvedValue({
      category: {},
      subCategories: [{ subCategoryId: 'u13', birthYearRule: 2014 }],
    })
    mocks.getDefinition.mockResolvedValue({
      testDefinitionId: 'jump-v1',
      name: 'Détente',
      code: 'JUMP',
      domain: 'PHYSICAL',
      status: 'ACTIVE',
      version: 1,
      metrics: [
        {
          metricKey: 'HEIGHT',
          label: 'Hauteur',
          valueType: 'NUMBER',
          unit: 'CENTIMETER',
          direction: 'HIGHER_IS_BETTER',
          required: true,
        },
      ],
      createdAt: date,
      updatedAt: date,
    })
    mocks.getBenchmarks.mockResolvedValue([])
  })

  it('ne relit que les résultats lors du passage A vers B dans la même Team', async () => {
    const { result: hook, rerender } = renderHook(
      ({ playerId }) => useTestPlayerHistory(context('u13'), playerId),
      { initialProps: { playerId: 'alice' }, wrapper },
    )
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))
    let resolveEmma!: (value: TestResult[]) => void
    mocks.listPlayerResults.mockImplementation(async ({ teamId }, playerId) =>
      playerId === 'emma'
        ? new Promise<TestResult[]>((resolve) => {
            resolveEmma = resolve
          })
        : [result(playerId, teamId)],
    )
    rerender({ playerId: 'emma' })
    expect(hook.current.data).toBeUndefined()
    await waitFor(() =>
      expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2),
    )
    resolveEmma([result('emma', 'u13')])
    await waitFor(() => expect(hook.current.data?.player.playerId).toBe('emma'))

    expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2)
    expect(mocks.listCompletedSessions).toHaveBeenCalledTimes(1)
    expect(mocks.listScopedPlayers).toHaveBeenCalledTimes(1)
    expect(mocks.getTaxonomy).toHaveBeenCalledTimes(1)
    expect(mocks.getDefinition).toHaveBeenCalledTimes(1)
    expect(mocks.getBenchmarks).toHaveBeenCalledTimes(1)

    rerender({ playerId: 'alice' })
    await waitFor(() =>
      expect(hook.current.data?.player.playerId).toBe('alice'),
    )
    expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2)
  })

  it('refuse un playerId hors roster avant toute lecture de ses résultats', async () => {
    const { result: hook } = renderHook(
      () => useTestPlayerHistory(context('u13'), 'intruder'),
      { wrapper },
    )

    await waitFor(() => expect(hook.current.isError).toBe(true))
    expect(mocks.listCompletedSessions).toHaveBeenCalledTimes(1)
    expect(mocks.listPlayerResults).not.toHaveBeenCalled()
  })

  it('recompose l’historique actif après mutation sans remount malgré le staleTime', async () => {
    const { result: hook } = renderHook(
      () => useTestPlayerHistory(context('u13'), 'alice'),
      { wrapper },
    )
    await waitFor(() =>
      expect(hook.current.data?.histories[0].metrics[0].latest?.value).toBe(38),
    )
    const updated = {
      ...result('alice', 'u13'),
      values: { HEIGHT: 42 },
      updatedAt: new Date('2026-08-13T12:00:00Z'),
    }
    mocks.listPlayerResults.mockResolvedValue([updated])

    await act(async () => {
      updateTestPlayerHistoryResults(client, context('u13'), [updated])
      await invalidateTestPlayerHistory(client, context('u13'), {
        playerIds: ['alice'],
      })
    })

    await waitFor(() =>
      expect(hook.current.data?.histories[0].metrics[0].latest?.value).toBe(42),
    )
  })

  it('recharge les données communes lorsque la Team change', async () => {
    const { result: hook, rerender } = renderHook(
      ({ teamId }) => useTestPlayerHistory(context(teamId), 'alice'),
      { initialProps: { teamId: 'u13' }, wrapper },
    )
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))
    rerender({ teamId: 'u14' })
    await waitFor(() =>
      expect(
        hook.current.data?.histories[0].metrics[0].points[0].session.teamId,
      ).toBe('u14'),
    )

    expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2)
    expect(mocks.listCompletedSessions).toHaveBeenCalledTimes(2)
    expect(mocks.getTaxonomy).toHaveBeenCalledTimes(2)
    expect(mocks.getDefinition).toHaveBeenCalledTimes(2)
    expect(mocks.getBenchmarks).toHaveBeenCalledTimes(2)
  })

  it('sépare U13F et U14F, puis réutilise chaque cache sans nouvelle lecture', async () => {
    const alice = {
      playerId: 'alice',
      firstName: 'Alice',
      lastName: 'Martin',
      birthDate: new Date('2014-01-01'),
      playerProfile: 'MIDFIELDER' as const,
      preferredFoot: 'RIGHT' as const,
      status: 'ACTIVE' as const,
      createdAt: date,
      updatedAt: date,
    }
    const lina = { ...alice, playerId: 'lina', firstName: 'Lina' }
    mocks.listCompletedSessions.mockImplementation(async ({ teamId }) =>
      teamId === 'u13' ? [session(teamId)] : [],
    )
    mocks.listPlayerResults.mockImplementation(async ({ teamId }, playerId) =>
      teamId === 'u13' ? [result(playerId, teamId)] : [],
    )
    const taxonomy = {
      category: {
        categoryId: 'category-u13',
        seasonId: 'season',
        name: 'U13F',
        subCategoryIds: ['u13'],
        status: 'ACTIVE' as const,
        createdAt: date,
        updatedAt: date,
      },
      subCategory: {
        subCategoryId: 'u13',
        seasonId: 'season',
        name: 'U13F',
        birthYearRule: 2014,
        createdAt: date,
        updatedAt: date,
      },
    }
    const { result: hook, rerender } = renderHook(
      ({ teamId, player, resolvedTaxonomy }) =>
        useTestPlayerHistory(context(teamId), player.playerId, {
          player,
          taxonomy: resolvedTaxonomy,
        }),
      {
        initialProps: {
          teamId: 'u13',
          player: alice,
          resolvedTaxonomy: taxonomy,
        },
        wrapper,
      },
    )
    await waitFor(() => expect(hook.current.data?.histories).toHaveLength(1))

    rerender({
      teamId: 'u14',
      player: lina,
      resolvedTaxonomy: {
        category: {
          categoryId: 'category-u14',
          seasonId: 'season',
          name: 'U14F',
          subCategoryIds: ['u14'],
          status: 'ACTIVE' as const,
          createdAt: date,
          updatedAt: date,
        },
        subCategory: {
          subCategoryId: 'u14',
          seasonId: 'season',
          name: 'U14F',
          birthYearRule: 2013,
          createdAt: date,
          updatedAt: date,
        },
      },
    })
    await waitFor(() => expect(hook.current.data?.histories).toEqual([]))
    expect(hook.current.data?.player.playerId).toBe('lina')

    rerender({ teamId: 'u13', player: alice, resolvedTaxonomy: taxonomy })
    await waitFor(() => expect(hook.current.data?.histories).toHaveLength(1))

    expect(mocks.listScopedPlayers).not.toHaveBeenCalled()
    expect(mocks.getTaxonomy).not.toHaveBeenCalled()
    expect(mocks.listCompletedSessions).toHaveBeenCalledTimes(2)
    expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2)
    expect(mocks.getDefinition).toHaveBeenCalledTimes(1)
    expect(mocks.getBenchmarks).toHaveBeenCalledTimes(1)
  })
})

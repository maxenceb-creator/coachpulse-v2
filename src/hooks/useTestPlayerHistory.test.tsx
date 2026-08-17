import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamAccess, TestResult, TestSession } from '../types/domain'
import type { TestHookContext } from './useTestSession'

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
    resolveEmma([result('emma', 'u13')])
    await waitFor(() => expect(hook.current.data?.player.playerId).toBe('emma'))

    expect(mocks.listPlayerResults).toHaveBeenCalledTimes(2)
    expect(mocks.listCompletedSessions).toHaveBeenCalledTimes(1)
    expect(mocks.listScopedPlayers).toHaveBeenCalledTimes(1)
    expect(mocks.getTaxonomy).toHaveBeenCalledTimes(1)
    expect(mocks.getDefinition).toHaveBeenCalledTimes(1)
    expect(mocks.getBenchmarks).toHaveBeenCalledTimes(1)
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
})

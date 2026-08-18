import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../query/queryKeys'
import { testsService } from '../services/appTestsService'
import type { TestDefinition, TestResult, TestSession } from '../types/domain'
import {
  useCreateTestSession,
  useDeleteTestSession,
  useSaveTestResults,
  useTestSession,
} from './useTestSession'

vi.mock('../services/appTestsService', () => ({
  testsService: {
    saveResults: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getSession: vi.fn(),
    getDefinitionForSession: vi.fn(),
    getEligiblePlayers: vi.fn(),
    getResults: vi.fn(),
  },
}))

const context = {
  uid: 'user',
  roleId: 'coach',
  teamId: 'u13',
  seasonId: 'season',
  accesses: [
    {
      userTeamAccessId: 'access',
      userId: 'user',
      teamId: 'u13',
      status: 'ACTIVE' as const,
      rolePermissions: {
        coach: {
          permissions: ['tests.read', 'tests.write'],
          medicalAccessLevel: 'NONE' as const,
        },
      },
    },
  ],
  securityContextReady: true,
}
const session = {
  testSessionId: 'session',
  teamId: 'u13',
  seasonId: 'season',
  status: 'DRAFT',
} as TestSession
const result = {
  testResultId: 'session_alice',
  testSessionId: 'session',
  playerId: 'alice',
  teamId: 'u13',
  seasonId: 'season',
  values: { TIME: 3.5 },
} as unknown as TestResult
const definition = (
  testDefinitionId: string,
  name: string,
): TestDefinition => ({
  testDefinitionId,
  name,
  code: testDefinitionId.toUpperCase(),
  domain: testDefinitionId === 'juggling' ? 'TECHNICAL' : 'PHYSICAL',
  status: 'ACTIVE',
  version: 1,
  metrics: [
    {
      metricKey: 'VALUE',
      label: 'Valeur',
      valueType: 'NUMBER',
      unit: 'SECOND',
      direction: 'LOWER_IS_BETTER',
      required: true,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('mutations sessions Tests — cache immédiat', () => {
  let client: QueryClient
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient()
    vi.mocked(testsService.getEligiblePlayers).mockResolvedValue([])
  })

  it('termine la sauvegarde/finalisation sans attendre les refetchs et met les caches à jour', async () => {
    vi.mocked(testsService.saveResults).mockResolvedValue([result])
    vi.spyOn(client, 'invalidateQueries').mockImplementation(
      () => new Promise(() => {}),
    )
    const sessionsKey = queryKeys.tests.sessions(
      'user',
      'coach',
      'u13',
      'season',
    )
    const detailKey = queryKeys.tests.session(
      'user',
      'coach',
      'u13',
      'season',
      'session',
    )
    const historyResultsKey = queryKeys.tests.playerHistoryResults(
      'user',
      'coach',
      'u13',
      'season',
      'alice',
    )
    client.setQueryData(sessionsKey, [session])
    client.setQueryData(detailKey, session)
    client.setQueryData<TestResult[]>(historyResultsKey, [
      { ...result, values: { TIME: 3.7 } },
    ])
    client.setQueryData(
      queryKeys.tests.playerHistorySessions('user', 'coach', 'u13', 'season'),
      [],
    )
    const { result: hook } = renderHook(() => useSaveTestResults(context), {
      wrapper,
    })

    await act(() =>
      hook.current.mutateAsync({
        session,
        definition: definition('sprint', 'Sprint 20 m'),
        players: [],
        drafts: [],
        complete: true,
      }),
    )

    expect(hook.current.isPending).toBe(false)
    expect(client.getQueryData<TestSession>(detailKey)?.status).toBe(
      'COMPLETED',
    )
    expect(client.getQueryData<TestSession[]>(sessionsKey)?.[0].status).toBe(
      'COMPLETED',
    )
    expect(
      client.getQueryData<TestResult[]>(historyResultsKey)?.[0].values,
    ).toEqual({ TIME: 3.5 })
  })

  it('rend création et suppression observables sans attendre un refetch', async () => {
    vi.mocked(testsService.createSession).mockImplementation(
      async (_security, input) => ({ ...session, ...input }),
    )
    vi.spyOn(client, 'invalidateQueries').mockImplementation(
      () => new Promise(() => {}),
    )
    const sessionsKey = queryKeys.tests.sessions(
      'user',
      'coach',
      'u13',
      'season',
    )
    client.setQueryData<TestSession[]>(sessionsKey, [])
    const { result: hook } = renderHook(
      () => ({
        create: useCreateTestSession(context),
        remove: useDeleteTestSession(context),
      }),
      { wrapper },
    )

    const created = await act(() =>
      hook.current.create.mutateAsync({
        definition: definition('sprint', 'Sprint 20 m'),
        categoryId: 'u13',
        date: new Date(),
      }),
    )
    expect(hook.current.create.isPending).toBe(false)
    expect(client.getQueryData<TestSession[]>(sessionsKey)).toEqual([created])

    vi.mocked(testsService.deleteSession).mockResolvedValue(created)
    await act(() => hook.current.remove.mutateAsync(created.testSessionId))
    expect(hook.current.remove.isPending).toBe(false)
    expect(client.getQueryData<TestSession[]>(sessionsKey)).toEqual([])
  })

  it.each([
    ['cooper', 'Cooper'],
    ['sprint-20m', 'Sprint 20 m'],
    ['juggling', 'Jongles'],
  ])(
    'ouvre immédiatement une nouvelle session %s depuis les caches alimentés avant navigation',
    async (definitionId, name) => {
      const selectedDefinition = definition(definitionId, name)
      vi.mocked(testsService.createSession).mockImplementation(
        async (_security, input) => ({
          ...session,
          ...input,
          testSessionId: input.testSessionId,
        }),
      )
      vi.mocked(testsService.getEligiblePlayers).mockResolvedValue([])
      vi.mocked(testsService.getSession).mockRejectedValue(
        new Error('session detail should come from cache'),
      )
      vi.mocked(testsService.getDefinitionForSession).mockRejectedValue(
        new Error('definition should come from cache'),
      )
      vi.mocked(testsService.getResults).mockRejectedValue(
        new Error('new session results should come from cache'),
      )
      const { result: hook, rerender } = renderHook(
        ({ id }) => ({
          create: useCreateTestSession(context),
          detail: useTestSession(context, id),
        }),
        { initialProps: { id: '' }, wrapper },
      )

      let cacheAtNavigation:
        | {
            session?: TestSession
            definition?: TestDefinition
            results?: TestResult[]
          }
        | undefined
      const created = await act(() =>
        hook.current.create.mutateAsync(
          {
            definition: selectedDefinition,
            categoryId: 'u13',
            date: new Date('2026-08-18T12:00:00Z'),
          },
          {
            onSuccess: (createdSession) => {
              cacheAtNavigation = {
                session: client.getQueryData(
                  queryKeys.tests.session(
                    'user',
                    'coach',
                    'u13',
                    'season',
                    createdSession.testSessionId,
                  ),
                ),
                definition: client.getQueryData(
                  queryKeys.tests.definition(
                    'user',
                    'coach',
                    'u13',
                    'season',
                    definitionId,
                    1,
                  ),
                ),
                results: client.getQueryData(
                  queryKeys.tests.results(
                    'user',
                    'coach',
                    'u13',
                    'season',
                    createdSession.testSessionId,
                  ),
                ),
              }
            },
          },
        ),
      )
      expect(cacheAtNavigation).toEqual({
        session: created,
        definition: selectedDefinition,
        results: [],
      })
      rerender({ id: created.testSessionId })

      expect(hook.current.detail.session.data).toMatchObject({
        testSessionId: created.testSessionId,
        testDefinitionId: definitionId,
      })
      expect(hook.current.detail.definition.data).toEqual(selectedDefinition)
      expect(hook.current.detail.results.data).toEqual([])
      await waitFor(() =>
        expect(hook.current.detail.players.isSuccess).toBe(true),
      )
      expect(testsService.getSession).not.toHaveBeenCalled()
      expect(testsService.getDefinitionForSession).not.toHaveBeenCalled()
      expect(testsService.getResults).not.toHaveBeenCalled()
      expect(testsService.getEligiblePlayers).toHaveBeenCalledTimes(1)
    },
  )
})

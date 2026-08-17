import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../query/queryKeys'
import { testsService } from '../services/appTestsService'
import type { TestDefinition, TestResult, TestSession } from '../types/domain'
import {
  useCreateTestSession,
  useDeleteTestSession,
  useSaveTestResults,
} from './useTestSession'

vi.mock('../services/appTestsService', () => ({
  testsService: {
    saveResults: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}))

const context = {
  uid: 'user',
  roleId: 'coach',
  teamId: 'u13',
  seasonId: 'season',
  accesses: [],
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

describe('mutations sessions Tests — cache immédiat', () => {
  let client: QueryClient
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient()
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
        definition: {} as TestDefinition,
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
    vi.mocked(testsService.createSession).mockResolvedValue(session)
    vi.mocked(testsService.deleteSession).mockResolvedValue(session)
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

    await act(() =>
      hook.current.create.mutateAsync({
        testDefinitionId: 'sprint',
        testDefinitionVersion: 1,
        categoryId: 'u13',
        date: new Date(),
      }),
    )
    expect(hook.current.create.isPending).toBe(false)
    expect(client.getQueryData<TestSession[]>(sessionsKey)).toEqual([session])

    await act(() => hook.current.remove.mutateAsync(session.testSessionId))
    expect(hook.current.remove.isPending).toBe(false)
    expect(client.getQueryData<TestSession[]>(sessionsKey)).toEqual([])
  })
})

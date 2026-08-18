import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { queryKeys } from '../query/queryKeys'
import {
  completeTestPlayerHistorySession,
  invalidateTestPlayerHistory,
  removeTestPlayerHistorySession,
  updateTestPlayerHistoryResults,
} from '../query/testPlayerHistoryCache'
import { testsService } from '../services/appTestsService'
import type {
  Player,
  TeamAccess,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import { hasPermission } from '../services/permissionsService'

export type TestHookContext = {
  uid: string
  roleId: string
  teamId: string
  seasonId: string
  accesses: TeamAccess[]
  securityContextReady: boolean
}

const security = (context: TestHookContext) => ({
  userId: context.uid,
  activeRoleId: context.roleId,
  teamId: context.teamId,
  accesses: context.accesses,
})

const SESSION_STALE_TIME = 30 * 1000
const DEFINITION_STALE_TIME = Number.POSITIVE_INFINITY
const ELIGIBLE_PLAYERS_STALE_TIME = 60 * 1000

const reconcileQueries = (invalidations: Promise<unknown>[]) => {
  void Promise.all(invalidations).catch((error: unknown) => {
    if (!import.meta.env.DEV) return
    const failure = error as Error & { code?: string }
    console.error('[TestCache DEV] Réconciliation échouée', {
      code: failure.code ?? 'UNKNOWN',
      message: failure.message,
    })
  })
}

export const useTestSession = (context: TestHookContext, id: string) => {
  const client = useQueryClient()
  const loggedSessionHit = useRef('')
  const enabled =
    context.securityContextReady &&
    !!id &&
    hasPermission(context.accesses, {
      userId: context.uid,
      activeRoleId: context.roleId,
      teamId: context.teamId,
      permissionKey: 'tests.read',
    })
  const sessionKey = queryKeys.tests.session(
    context.uid,
    context.roleId,
    context.teamId,
    context.seasonId,
    id,
  )
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: () => {
      if (import.meta.env.DEV)
        console.debug('[TestSession DEV] Session query miss', {
          testSessionId: id,
          teamId: context.teamId,
          seasonId: context.seasonId,
        })
      return testsService.getSession(security(context), id)
    },
    enabled,
    staleTime: SESSION_STALE_TIME,
  })
  if (
    import.meta.env.DEV &&
    client.getQueryData(sessionKey) &&
    loggedSessionHit.current !== id
  ) {
    loggedSessionHit.current = id
    console.debug('[TestSession DEV] Session query hit', {
      testSessionId: id,
      teamId: context.teamId,
      seasonId: context.seasonId,
    })
  }
  const definition = useQuery({
    queryKey: queryKeys.tests.definition(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      session.data?.testDefinitionId ?? '',
      session.data?.testDefinitionVersion ?? 0,
    ),
    queryFn: () =>
      testsService.getDefinitionForSession(security(context), session.data!),
    enabled: enabled && !!session.data,
    staleTime: DEFINITION_STALE_TIME,
  })
  const players = useQuery({
    queryKey: queryKeys.tests.eligiblePlayers(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      id,
    ),
    queryFn: () =>
      testsService.getEligiblePlayers(security(context), session.data!),
    enabled: enabled && !!session.data,
    staleTime: ELIGIBLE_PLAYERS_STALE_TIME,
  })
  const results = useQuery({
    queryKey: queryKeys.tests.results(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      id,
    ),
    queryFn: () => testsService.getResults(security(context), session.data!),
    enabled: enabled && !!session.data,
    staleTime: SESSION_STALE_TIME,
  })
  return { session, definition, players, results }
}

export const useSaveTestResults = (context: TestHookContext) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      session: TestSession
      definition: TestDefinition
      players: Player[]
      drafts: { playerId: string; values: Record<string, number | undefined> }[]
      complete: boolean
    }) =>
      testsService.saveResults(
        security(context),
        input.session,
        input.definition,
        input.players,
        input.drafts,
        input.complete,
      ),
    onSuccess: (savedResults, input) => {
      const completedSession: TestSession = input.complete
        ? { ...input.session, status: 'COMPLETED', updatedAt: new Date() }
        : input.session
      const sessionKey = queryKeys.tests.session(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        input.session.testSessionId,
      )
      const resultsKey = queryKeys.tests.results(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        input.session.testSessionId,
      )
      client.setQueryData<TestResult[]>(resultsKey, (current = []) => {
        const savedIds = new Set(
          savedResults.map(({ testResultId }) => testResultId),
        )
        return [
          ...current.filter(({ testResultId }) => !savedIds.has(testResultId)),
          ...savedResults,
        ]
      })
      updateTestPlayerHistoryResults(client, context, savedResults)
      if (input.complete) {
        client.setQueryData(sessionKey, completedSession)
        client.setQueryData<TestSession[]>(
          queryKeys.tests.sessions(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
          ),
          (current) =>
            current?.map((session) =>
              session.testSessionId === completedSession.testSessionId
                ? completedSession
                : session,
            ),
        )
        completeTestPlayerHistorySession(client, context, completedSession)
      }
      const invalidations: Promise<unknown>[] = [
        client.invalidateQueries({
          queryKey: resultsKey,
        }),
        client.invalidateQueries({
          queryKey: queryKeys.tests.analysisRoot(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
          ),
        }),
        invalidateTestPlayerHistory(client, context, {
          playerIds: savedResults.map(({ playerId }) => playerId),
          sessions: input.complete,
        }),
      ]
      if (input.complete)
        invalidations.push(
          client.invalidateQueries({
            queryKey: sessionKey,
          }),
          client.invalidateQueries({
            queryKey: queryKeys.tests.sessions(
              context.uid,
              context.roleId,
              context.teamId,
              context.seasonId,
            ),
          }),
        )
      reconcileQueries(invalidations)
    },
  })
}

export const useTestSessions = (context: TestHookContext) =>
  useQuery({
    queryKey: queryKeys.tests.sessions(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
    ),
    queryFn: async () => {
      const diagnostic = {
        operation: 'list testSessions',
        queryConstraints: [
          ['teamId', '==', context.teamId],
          ['seasonId', '==', context.seasonId],
          ['date', 'orderBy', 'desc'],
          ['limit', 100],
        ],
        teamId: context.teamId,
        seasonId: context.seasonId,
        roleId: context.roleId,
        securityContextReady: context.securityContextReady,
      }
      if (import.meta.env.DEV) {
        console.debug('[TestSessions DEV] Requête', diagnostic)
      }
      try {
        const sessions = await testsService.listSessions(
          security(context),
          context.seasonId,
        )
        if (import.meta.env.DEV) {
          console.debug('[TestSessions DEV] Succès', {
            ...diagnostic,
            resultCount: sessions.length,
          })
        }
        return sessions
      } catch (error) {
        const failure = error as Error & { code?: string }
        if (import.meta.env.DEV) {
          console.error('[TestSessions DEV] Échec', {
            ...diagnostic,
            code: failure.code ?? 'UNKNOWN',
            message: failure.message,
          })
        }
        throw error
      }
    },
    enabled:
      context.securityContextReady &&
      hasPermission(context.accesses, {
        userId: context.uid,
        activeRoleId: context.roleId,
        teamId: context.teamId,
        permissionKey: 'tests.read',
      }),
  })

export const useCreateTestSession = (context: TestHookContext) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      definition: TestDefinition
      categoryId: string
      date: Date
    }) => {
      if (import.meta.env.DEV)
        console.debug('[TestSession DEV] Create start', {
          testDefinitionId: input.definition.testDefinitionId,
          version: input.definition.version,
          teamId: context.teamId,
          seasonId: context.seasonId,
        })
      return testsService
        .createSession(security(context), {
          testSessionId: crypto.randomUUID(),
          testDefinitionId: input.definition.testDefinitionId,
          testDefinitionVersion: input.definition.version,
          categoryId: input.categoryId,
          date: input.date,
          teamId: context.teamId,
          seasonId: context.seasonId,
        })
        .then((session) => {
          if (import.meta.env.DEV)
            console.debug('[TestSession DEV] Firestore success', {
              testSessionId: session.testSessionId,
              testDefinitionId: session.testDefinitionId,
              version: session.testDefinitionVersion,
            })
          return session
        })
    },
    onSuccess: (session, input) => {
      client.setQueryData<TestSession[]>(
        queryKeys.tests.sessions(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
        ),
        (current = []) => [
          session,
          ...current.filter(
            ({ testSessionId }) => testSessionId !== session.testSessionId,
          ),
        ],
      )
      if (import.meta.env.DEV)
        console.debug('[TestSession DEV] Cache session list update', {
          testSessionId: session.testSessionId,
        })
      client.setQueryData(
        queryKeys.tests.session(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          session.testSessionId,
        ),
        session,
      )
      if (import.meta.env.DEV)
        console.debug('[TestSession DEV] Cache session detail update', {
          testSessionId: session.testSessionId,
        })
      client.setQueryData(
        queryKeys.tests.definition(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          input.definition.testDefinitionId,
          input.definition.version,
        ),
        input.definition,
      )
      client.setQueryData<TestResult[]>(
        queryKeys.tests.results(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          session.testSessionId,
        ),
        [],
      )
      void client.prefetchQuery({
        queryKey: queryKeys.tests.eligiblePlayers(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          session.testSessionId,
        ),
        queryFn: () =>
          testsService.getEligiblePlayers(security(context), session),
        staleTime: ELIGIBLE_PLAYERS_STALE_TIME,
      })
      reconcileQueries([
        client.invalidateQueries({
          queryKey: queryKeys.tests.sessions(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
          ),
        }),
        invalidateTestPlayerHistory(client, context, { sessions: true }),
      ])
    },
  })
}

export const useDeleteTestSession = (context: TestHookContext) => {
  const client = useQueryClient()
  const sessionsKey = queryKeys.tests.sessions(
    context.uid,
    context.roleId,
    context.teamId,
    context.seasonId,
  )
  return useMutation({
    mutationFn: (testSessionId: string) =>
      testsService.deleteSession(
        security(context),
        testSessionId,
        context.seasonId,
      ),
    onSuccess: (deleted) => {
      client.setQueryData<TestSession[]>(sessionsKey, (sessions = []) =>
        sessions.filter(
          ({ testSessionId }) => testSessionId !== deleted.testSessionId,
        ),
      )
      client.removeQueries({
        queryKey: queryKeys.tests.session(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          deleted.testSessionId,
        ),
        exact: true,
      })
      client.removeQueries({
        queryKey: queryKeys.tests.results(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          deleted.testSessionId,
        ),
        exact: true,
      })
      removeTestPlayerHistorySession(client, context, deleted.testSessionId)
      reconcileQueries([
        client.invalidateQueries({ queryKey: sessionsKey, exact: true }),
        client.invalidateQueries({
          queryKey: queryKeys.tests.analysisRoot(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
          ),
        }),
        invalidateTestPlayerHistory(client, context, {
          playerIds: [],
          sessions: true,
        }),
      ])
    },
    onError: (error, testSessionId) => {
      if (!import.meta.env.DEV) return
      const failure = error as Error & { code?: string }
      console.error('[TestSession DEV] Mutation de suppression refusée', {
        testSessionId,
        code: failure.code ?? 'UNKNOWN',
        message: failure.message,
        error,
      })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { invalidateTestPlayerHistory } from '../query/testPlayerHistoryCache'
import { testsService } from '../services/appTestsService'
import type {
  Player,
  TeamAccess,
  TestDefinition,
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

export const useTestSession = (context: TestHookContext, id: string) => {
  const enabled =
    context.securityContextReady &&
    !!id &&
    hasPermission(context.accesses, {
      userId: context.uid,
      activeRoleId: context.roleId,
      teamId: context.teamId,
      permissionKey: 'tests.read',
    })
  const session = useQuery({
    queryKey: queryKeys.tests.session(
      context.uid,
      context.roleId,
      context.teamId,
      context.seasonId,
      id,
    ),
    queryFn: () => testsService.getSession(security(context), id),
    enabled,
  })
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
  })
  const players = useQuery({
    queryKey: [
      ...queryKeys.tests.session(
        context.uid,
        context.roleId,
        context.teamId,
        context.seasonId,
        id,
      ),
      'eligiblePlayers',
    ],
    queryFn: () =>
      testsService.getEligiblePlayers(security(context), session.data!),
    enabled: enabled && !!session.data,
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
    onSuccess: async (savedResults, input) => {
      const invalidations: Promise<unknown>[] = [
        client.invalidateQueries({
          queryKey: queryKeys.tests.results(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
            input.session.testSessionId,
          ),
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
            queryKey: queryKeys.tests.session(
              context.uid,
              context.roleId,
              context.teamId,
              context.seasonId,
              input.session.testSessionId,
            ),
          }),
        )
      await Promise.all(invalidations)
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
      testDefinitionId: string
      testDefinitionVersion: number
      categoryId: string
      date: Date
    }) =>
      testsService.createSession(security(context), {
        ...input,
        testSessionId: crypto.randomUUID(),
        teamId: context.teamId,
        seasonId: context.seasonId,
      }),
    onSuccess: async () => {
      await Promise.all([
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
    onSuccess: async (deleted) => {
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
      await Promise.all([
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

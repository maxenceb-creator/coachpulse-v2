import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsService } from '../services/appTestsService'
import type {
  Player,
  TeamAccess,
  TestDefinition,
  TestSession,
} from '../types/domain'

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
  const enabled = context.securityContextReady && !!id
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
    onSuccess: (_, input) => {
      void client.invalidateQueries({
        queryKey: queryKeys.tests.results(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
          input.session.testSessionId,
        ),
      })
      if (input.complete)
        void client.invalidateQueries({
          queryKey: queryKeys.tests.session(
            context.uid,
            context.roleId,
            context.teamId,
            context.seasonId,
            input.session.testSessionId,
          ),
        })
      void client.invalidateQueries({
        queryKey: queryKeys.tests.analysisRoot(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
        ),
      })
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
    enabled: context.securityContextReady,
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
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryKeys.tests.sessions(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
        ),
      }),
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
      void client.invalidateQueries({ queryKey: sessionsKey, exact: true })
      void client.invalidateQueries({
        queryKey: queryKeys.tests.analysisRoot(
          context.uid,
          context.roleId,
          context.teamId,
          context.seasonId,
        ),
      })
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

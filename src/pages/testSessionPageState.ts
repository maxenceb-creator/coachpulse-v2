import type {
  Player,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'

type QueryState<T> = {
  data: T | undefined
  error: unknown
  isError: boolean
  isPending: boolean
}

type TestSessionPageStateInput = {
  appError: unknown
  appLoading: boolean
  session: QueryState<TestSession>
  definition: QueryState<TestDefinition>
  players: QueryState<Player[]>
  results: QueryState<TestResult[]>
}

export type TestSessionPageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      session: TestSession
      definition: TestDefinition
      players: Player[]
      results: TestResult[]
    }

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined

export const resolveTestSessionPageState = (
  input: TestSessionPageStateInput,
): TestSessionPageState => {
  if (input.appError)
    return {
      status: 'error',
      message: 'Session inaccessible dans ce contexte.',
    }

  if (input.session.isError) {
    return {
      status: 'error',
      message:
        errorCode(input.session.error) === 'TEST_SESSION_NOT_FOUND'
          ? 'Session de test introuvable.'
          : 'Session inaccessible dans ce contexte.',
    }
  }
  if (input.definition.isError) {
    const code = errorCode(input.definition.error)
    return {
      status: 'error',
      message:
        code === 'TEST_DEFINITION_NOT_FOUND'
          ? 'Protocole de test introuvable pour cette session.'
          : code === 'TEST_DEFINITION_VERSION_MISMATCH'
            ? 'La version du protocole de cette session est introuvable.'
            : 'Protocole de test inaccessible dans ce contexte.',
    }
  }
  if (input.players.isError || input.results.isError) {
    return {
      status: 'error',
      message: 'Données de la session inaccessibles dans ce contexte.',
    }
  }

  if (input.appLoading || input.session.isPending) return { status: 'loading' }
  if (!input.session.data)
    return { status: 'error', message: 'Session de test introuvable.' }

  if (input.definition.isPending) return { status: 'loading' }
  if (!input.definition.data)
    return {
      status: 'error',
      message: 'Protocole de test introuvable pour cette session.',
    }

  if (input.players.isPending || input.results.isPending)
    return { status: 'loading' }
  if (!input.players.data || !input.results.data)
    return {
      status: 'error',
      message: 'Données de la session incomplètes.',
    }

  return {
    status: 'success',
    session: input.session.data,
    definition: input.definition.data,
    players: input.players.data,
    results: input.results.data,
  }
}

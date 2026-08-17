import type { TestDefinition } from '../types/domain'

export type TestAnalysisPageState =
  | 'LOADING_CONTEXT'
  | 'UNAUTHORIZED'
  | 'LOADING_DEFINITIONS'
  | 'NOT_FOUND'
  | 'NO_METRICS'
  | 'LOADING_ANALYSIS'
  | 'ERROR'
  | 'SUCCESS'

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined

export const testAnalysisErrorMessage = (error: unknown) => {
  const code = errorCode(error)
  if (code?.endsWith('failed-precondition'))
    return 'L’index Firestore requis pour cette analyse est en cours de préparation.'
  if (code?.endsWith('permission-denied'))
    return 'Vous n’avez pas accès à cette analyse.'
  return 'Impossible de charger cette analyse.'
}

export const resolveTestAnalysisPageState = (input: {
  appLoading: boolean
  appError: boolean
  securityContextReady: boolean
  canReadTests: boolean
  testDefinitionId: string
  definitionsPending: boolean
  definitionsError: boolean
  definition?: TestDefinition
  analysisEnabled: boolean
  analysisPending: boolean
  analysisFetching: boolean
  analysisError: boolean
  hasAnalysisData: boolean
}): TestAnalysisPageState => {
  if (input.appError) return 'ERROR'
  if (input.appLoading || !input.securityContextReady) return 'LOADING_CONTEXT'
  if (!input.canReadTests) return 'UNAUTHORIZED'
  if (!input.testDefinitionId) return 'NOT_FOUND'
  if (input.definitionsError) return 'ERROR'
  if (input.definitionsPending) return 'LOADING_DEFINITIONS'
  if (!input.definition) return 'NOT_FOUND'
  if (!input.definition.metrics.length) return 'NO_METRICS'
  if (!input.analysisEnabled) return 'ERROR'
  if (input.analysisError) return 'ERROR'
  if (input.analysisPending && input.analysisFetching) return 'LOADING_ANALYSIS'
  return input.hasAnalysisData ? 'SUCCESS' : 'ERROR'
}

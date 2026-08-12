export type TestDefinitionAdminViewState =
  | 'LOADING_CONTEXT'
  | 'UNAUTHORIZED'
  | 'LOADING'
  | 'NOT_FOUND'
  | 'ERROR'
  | 'SUCCESS'

export const resolveTestDefinitionAdminViewState = (input: {
  appLoading: boolean
  securityContextReady: boolean
  allowed: boolean
  testDefinitionId: string
  queryPending: boolean
  queryError: boolean
  errorCode?: string
  hasData: boolean
}): TestDefinitionAdminViewState => {
  if (input.appLoading || !input.securityContextReady) return 'LOADING_CONTEXT'
  if (!input.allowed) return 'UNAUTHORIZED'
  if (!input.testDefinitionId) return 'NOT_FOUND'
  if (input.queryPending) return 'LOADING'
  if (input.queryError)
    return input.errorCode === 'TEST_DEFINITION_NOT_FOUND'
      ? 'NOT_FOUND'
      : 'ERROR'
  return input.hasData ? 'SUCCESS' : 'NOT_FOUND'
}

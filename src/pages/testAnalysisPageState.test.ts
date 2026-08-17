import { describe, expect, it } from 'vitest'
import type { TestDefinition } from '../types/domain'
import {
  resolveTestAnalysisPageState,
  testAnalysisErrorMessage,
} from './testAnalysisPageState'

const definition = (metrics = 1): TestDefinition => ({
  testDefinitionId: 'test-juggling-v1',
  name: 'Jongles',
  code: 'JUGGLING',
  domain: 'TECHNICAL',
  status: 'ACTIVE',
  version: 1,
  metrics: metrics
    ? [
        {
          metricKey: 'COUNT',
          label: 'Nombre',
          valueType: 'NUMBER',
          unit: 'COUNT',
          direction: 'HIGHER_IS_BETTER',
          required: true,
        },
      ]
    : [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const base = {
  appLoading: false,
  appError: false,
  securityContextReady: true,
  canReadTests: true,
  testDefinitionId: 'test-juggling-v1',
  definitionsPending: false,
  definitionsError: false,
  definition: definition(),
  analysisEnabled: true,
  analysisPending: false,
  analysisFetching: false,
  analysisError: false,
  hasAnalysisData: true,
}

describe('état de la route Analyse Tests', () => {
  it('distingue contexte, permission, introuvable et métriques absentes', () => {
    expect(
      resolveTestAnalysisPageState({ ...base, securityContextReady: false }),
    ).toBe('LOADING_CONTEXT')
    expect(resolveTestAnalysisPageState({ ...base, canReadTests: false })).toBe(
      'UNAUTHORIZED',
    )
    expect(
      resolveTestAnalysisPageState({ ...base, definition: undefined }),
    ).toBe('NOT_FOUND')
    expect(
      resolveTestAnalysisPageState({ ...base, definition: definition(0) }),
    ).toBe('NO_METRICS')
  })

  it('ne considère comme loading qu’une query réellement en cours', () => {
    expect(
      resolveTestAnalysisPageState({
        ...base,
        analysisPending: true,
        analysisFetching: true,
        hasAnalysisData: false,
      }),
    ).toBe('LOADING_ANALYSIS')
    expect(
      resolveTestAnalysisPageState({
        ...base,
        analysisEnabled: false,
        analysisPending: true,
        hasAnalysisData: false,
      }),
    ).toBe('ERROR')
  })

  it('distingue erreur et succès', () => {
    expect(resolveTestAnalysisPageState({ ...base, analysisError: true })).toBe(
      'ERROR',
    )
    expect(resolveTestAnalysisPageState(base)).toBe('SUCCESS')
  })

  it('expose explicitement un index non READY et une permission refusée', () => {
    expect(testAnalysisErrorMessage({ code: 'failed-precondition' })).toContain(
      'index Firestore',
    )
    expect(testAnalysisErrorMessage({ code: 'permission-denied' })).toBe(
      'Vous n’avez pas accès à cette analyse.',
    )
  })
})

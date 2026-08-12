import { describe, expect, it } from 'vitest'
import { metricColumns } from '../services/testEntryColumns'
import type { TestDefinition } from '../types/domain'
import { resolveTestSessionPageState } from './testSessionPageState'

const settled = <T>(data: T | undefined) => ({
  data,
  error: null,
  isError: false,
  isPending: false,
})

const pending = <T>() => ({
  data: undefined as T | undefined,
  error: null,
  isError: false,
  isPending: true,
})

describe('table de saisie Tests', () => {
  it('dérive toutes les colonnes des métriques sans connaître le protocole', () => {
    const definition = {
      metrics: [
        { metricKey: 'TIME', label: 'Temps', unit: 'SECOND' },
        { metricKey: 'NEW_METRIC', label: 'Nouvelle métrique', unit: 'COUNT' },
      ],
    } as TestDefinition
    expect(metricColumns(definition)).toEqual([
      { key: 'TIME', label: 'Temps', unit: 'SECOND' },
      { key: 'NEW_METRIC', label: 'Nouvelle métrique', unit: 'COUNT' },
    ])
  })

  it('reste en chargement si la session est présente mais pas encore sa définition', () => {
    const session = { testSessionId: 'session' } as never
    const state = resolveTestSessionPageState({
      appError: null,
      appLoading: false,
      session: settled(session),
      definition: pending(),
      players: pending(),
      results: pending(),
    })

    expect(state).toEqual({ status: 'loading' })
  })

  it('affiche une erreur fonctionnelle si la définition est introuvable', () => {
    const session = { testSessionId: 'session' } as never
    const state = resolveTestSessionPageState({
      appError: null,
      appLoading: false,
      session: settled(session),
      definition: settled(undefined),
      players: pending(),
      results: pending(),
    })

    expect(state).toEqual({
      status: 'error',
      message: 'Protocole de test introuvable pour cette session.',
    })
  })
})

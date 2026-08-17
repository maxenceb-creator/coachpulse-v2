import { describe, expect, it, vi } from 'vitest'
import { TestsCatalogueError } from '../services/testsCatalogueService'
import type { TestMetricDefinition } from '../types/domain'
import {
  benchmarkCreationErrorMessage,
  benchmarkMetricOptions,
  confirmBenchmarkDeletion,
  definitionSaveErrorMessage,
  hasUnsavedBenchmarkMetrics,
} from './testBenchmarkAdminState'

const metric: TestMetricDefinition = {
  metricKey: 'HEIGHT',
  label: 'Hauteur',
  valueType: 'NUMBER',
  unit: 'CENTIMETER',
  direction: 'HIGHER_IS_BETTER',
  required: true,
  order: 0,
}

describe('administration des benchmarks', () => {
  it('détecte une métrique locale non encore persistée', () => {
    expect(hasUnsavedBenchmarkMetrics([metric], [])).toBe(true)
    expect(hasUnsavedBenchmarkMetrics([metric], [metric])).toBe(false)
  })

  it('propose les métriques d’une définition DRAFT dans leur ordre', () => {
    const options = benchmarkMetricOptions([
      { ...metric, metricKey: 'DISTANCE', order: 1 },
      metric,
    ])

    expect(options.map(({ metricKey }) => metricKey)).toEqual([
      'HEIGHT',
      'DISTANCE',
    ])
  })

  it('demande une confirmation explicite avant suppression définitive', () => {
    const confirm = vi.fn(() => true)

    expect(confirmBenchmarkDeletion(confirm)).toBe(true)
    expect(confirm).toHaveBeenCalledWith(
      'Supprimer définitivement ce benchmark ? Cette action est irréversible.',
    )
  })

  it.each([
    [
      new TestsCatalogueError('BENCHMARK_INVALID'),
      'Benchmark invalide : vérifiez la métrique sauvegardée, la sous-catégorie et la valeur.',
    ],
    [
      new TestsCatalogueError('BENCHMARK_DUPLICATE'),
      'Benchmark déjà existant pour cette saison, sous-catégorie, version, métrique et ce niveau.',
    ],
    [
      { code: 'permission-denied' },
      'Non autorisé : permission tests.manage requise.',
    ],
    [
      new Error('network'),
      'Erreur Firestore lors de la création du benchmark.',
    ],
  ])('distingue les erreurs de création', (error, message) => {
    expect(benchmarkCreationErrorMessage(error)).toBe(message)
  })

  it.each([
    [
      new TestsCatalogueError('TEST_DEFINITION_INVALID'),
      'Brouillon invalide : vérifiez les clés, libellés, unités, bornes et précisions des métriques.',
    ],
    [
      new TestsCatalogueError('TEST_DEFINITION_IMMUTABLE'),
      'Protocole immutable : seules les définitions DRAFT peuvent être modifiées.',
    ],
    [
      { code: 'permission-denied' },
      'Non autorisé : permission tests.manage requise.',
    ],
    [
      new Error('network'),
      'Erreur Firestore lors de la sauvegarde du brouillon.',
    ],
  ])('distingue les erreurs de sauvegarde', (error, message) => {
    expect(definitionSaveErrorMessage(error)).toBe(message)
  })
})

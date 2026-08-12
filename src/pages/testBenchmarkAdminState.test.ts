import { describe, expect, it } from 'vitest'
import { TestsCatalogueError } from '../services/testsCatalogueService'
import type { TestMetricDefinition } from '../types/domain'
import {
  benchmarkCreationErrorMessage,
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
})

import { TestsCatalogueError } from '../services/testsCatalogueService'
import type { TestMetricDefinition } from '../types/domain'

export const hasUnsavedBenchmarkMetrics = (
  displayed: TestMetricDefinition[],
  persisted: TestMetricDefinition[],
) => JSON.stringify(displayed) !== JSON.stringify(persisted)

export const benchmarkMetricOptions = (metrics: TestMetricDefinition[]) =>
  metrics
    .map((metric, index) => ({ ...metric, order: metric.order ?? index }))
    .sort((left, right) => left.order - right.order)

export const benchmarkCreationErrorMessage = (error: unknown) => {
  const code =
    error instanceof TestsCatalogueError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined

  if (code === 'BENCHMARK_INVALID')
    return 'Benchmark invalide : vérifiez la métrique sauvegardée, la sous-catégorie et la valeur.'
  if (code === 'BENCHMARK_DUPLICATE')
    return 'Benchmark déjà existant pour cette saison, sous-catégorie, version, métrique et ce niveau.'
  if (code === 'PERMISSION_DENIED' || code === 'permission-denied')
    return 'Non autorisé : permission tests.manage requise.'
  return 'Erreur Firestore lors de la création du benchmark.'
}

export const definitionSaveErrorMessage = (error: unknown) => {
  const code =
    error instanceof TestsCatalogueError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined
  if (code === 'TEST_DEFINITION_INVALID')
    return 'Brouillon invalide : vérifiez les clés, libellés, unités, bornes et précisions des métriques.'
  if (code === 'TEST_DEFINITION_IMMUTABLE')
    return 'Protocole immutable : seules les définitions DRAFT peuvent être modifiées.'
  if (code === 'PERMISSION_DENIED' || code === 'permission-denied')
    return 'Non autorisé : permission tests.manage requise.'
  return 'Erreur Firestore lors de la sauvegarde du brouillon.'
}

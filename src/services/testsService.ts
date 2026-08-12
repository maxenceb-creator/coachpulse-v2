import type {
  TeamAccess,
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
} from '../types/domain'
import type {
  TestBenchmarksQuery,
  TestsRepository,
} from '../repositories/testsRepository'
import { hasPermission } from './permissionsService'

export type TestsSecurityContext = {
  userId: string
  activeRoleId: string
  teamId: string
  accesses: TeamAccess[]
}

export class TestsDomainError extends Error {
  constructor(
    public readonly code:
      | 'PERMISSION_DENIED'
      | 'TEST_DEFINITION_NOT_FOUND'
      | 'BENCHMARK_METRIC_NOT_FOUND'
      | 'BENCHMARK_VERSION_MISMATCH'
      | 'BENCHMARK_SUBCATEGORY_MISMATCH'
      | 'BENCHMARK_VALUE_OUT_OF_RANGE',
  ) {
    super(code)
  }
}

const requireTestsRead = (context: TestsSecurityContext) => {
  if (
    !hasPermission(context.accesses, {
      userId: context.userId,
      activeRoleId: context.activeRoleId,
      teamId: context.teamId,
      permissionKey: 'tests.read',
    })
  ) {
    throw new TestsDomainError('PERMISSION_DENIED')
  }
}

export const validateBenchmarkCompatibility = (
  benchmark: TestBenchmark,
  definition: TestDefinition,
  allowedSubCategoryIds?: string[],
) => {
  if (benchmark.testDefinitionId !== definition.testDefinitionId) {
    throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
  }
  if (benchmark.testDefinitionVersion !== definition.version) {
    throw new TestsDomainError('BENCHMARK_VERSION_MISMATCH')
  }
  const metric = definition.metrics.find(
    ({ metricKey }) => metricKey === benchmark.metricKey,
  )
  if (!metric) throw new TestsDomainError('BENCHMARK_METRIC_NOT_FOUND')
  if (
    allowedSubCategoryIds &&
    !allowedSubCategoryIds.includes(benchmark.subCategoryId)
  ) {
    throw new TestsDomainError('BENCHMARK_SUBCATEGORY_MISMATCH')
  }
  if (
    (metric.minValue !== undefined &&
      benchmark.targetValue < metric.minValue) ||
    (metric.maxValue !== undefined && benchmark.targetValue > metric.maxValue)
  ) {
    throw new TestsDomainError('BENCHMARK_VALUE_OUT_OF_RANGE')
  }
  return metric
}

export const isTargetReached = (
  value: number | null | undefined,
  targetValue: number,
  metric: TestMetricDefinition,
): boolean | null => {
  if (value === null || value === undefined) return null
  if (metric.direction === 'HIGHER_IS_BETTER') return value >= targetValue
  if (metric.direction === 'LOWER_IS_BETTER') return value <= targetValue
  return null
}

export const areTestMetricsComparable = (
  left: { definition: TestDefinition; metric: TestMetricDefinition },
  right: { definition: TestDefinition; metric: TestMetricDefinition },
) =>
  left.definition.testDefinitionId === right.definition.testDefinitionId &&
  left.definition.version === right.definition.version &&
  left.metric.metricKey === right.metric.metricKey &&
  left.metric.unit === right.metric.unit &&
  left.metric.direction === right.metric.direction

export const createTestsService = (repository: TestsRepository) => ({
  async getActiveDefinitions(context: TestsSecurityContext) {
    requireTestsRead(context)
    return repository.getActiveDefinitions()
  },
  async getDefinitionById(
    context: TestsSecurityContext,
    testDefinitionId: string,
  ) {
    requireTestsRead(context)
    const definition = await repository.getDefinitionById(testDefinitionId)
    if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    return definition
  },
  async getApplicableBenchmarks(
    context: TestsSecurityContext,
    query: TestBenchmarksQuery,
    allowedSubCategoryIds: string[],
  ) {
    requireTestsRead(context)
    if (!allowedSubCategoryIds.includes(query.subCategoryId)) {
      throw new TestsDomainError('BENCHMARK_SUBCATEGORY_MISMATCH')
    }
    const benchmarks = await repository.getBenchmarks(query)
    const definitions = new Map<string, TestDefinition>()
    for (const benchmark of benchmarks) {
      let definition = definitions.get(benchmark.testDefinitionId)
      if (!definition) {
        definition =
          (await repository.getDefinitionById(benchmark.testDefinitionId)) ??
          undefined
        if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
        definitions.set(definition.testDefinitionId, definition)
      }
      validateBenchmarkCompatibility(
        benchmark,
        definition,
        allowedSubCategoryIds,
      )
    }
    return benchmarks
  },
})

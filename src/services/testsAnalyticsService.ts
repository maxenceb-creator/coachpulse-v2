import type {
  BenchmarkComparison,
  MetricPerformanceComparison,
  PlayerTestHistoryPoint,
  TestBenchmark,
  TestComparisonCompatibility,
  TestMetricDefinition,
  TestResult,
} from '../types/domain'

export type ComparableMetricResult = {
  testDefinitionId: string
  testDefinitionVersion: number
  metricKey: string
  unit: TestMetricDefinition['unit']
  value: number
}

export const getComparisonCompatibility = (
  previous: ComparableMetricResult,
  current: ComparableMetricResult,
): TestComparisonCompatibility => {
  if (previous.testDefinitionId !== current.testDefinitionId)
    return 'INCOMPATIBLE_DEFINITION'
  if (previous.testDefinitionVersion !== current.testDefinitionVersion)
    return 'INCOMPATIBLE_VERSION'
  if (previous.metricKey !== current.metricKey) return 'INCOMPATIBLE_METRIC'
  if (previous.unit !== current.unit) return 'INCOMPATIBLE_UNIT'
  return 'COMPATIBLE'
}

export const relativeChange = (
  previousValue: number,
  currentValue: number,
): number | undefined =>
  previousValue === 0
    ? undefined
    : ((currentValue - previousValue) / Math.abs(previousValue)) * 100

export const compareMetricResults = (
  previous: ComparableMetricResult,
  current: ComparableMetricResult,
  metric: TestMetricDefinition,
): MetricPerformanceComparison => {
  const compatibility = getComparisonCompatibility(previous, current)
  const base = {
    compatibility,
    previousValue: previous.value,
    currentValue: current.value,
  }
  if (compatibility !== 'COMPATIBLE') return base
  const delta = current.value - previous.value
  if (
    metric.direction !== 'HIGHER_IS_BETTER' &&
    metric.direction !== 'LOWER_IS_BETTER'
  ) {
    return { ...base, delta }
  }
  const directionalDelta =
    metric.direction === 'HIGHER_IS_BETTER' ? delta : -delta
  return {
    ...base,
    delta,
    directionalDelta,
    relativeChange: relativeChange(previous.value, current.value),
    trend:
      directionalDelta > 0
        ? 'IMPROVED'
        : directionalDelta < 0
          ? 'REGRESSED'
          : 'STABLE',
  }
}

export const compareToBenchmark = (
  value: number,
  benchmark: TestBenchmark,
  metric: TestMetricDefinition,
): BenchmarkComparison => {
  const rawDelta = value - benchmark.targetValue
  if (
    metric.direction !== 'HIGHER_IS_BETTER' &&
    metric.direction !== 'LOWER_IS_BETTER'
  ) {
    return {
      targetValue: benchmark.targetValue,
      direction: metric.direction,
      status: 'NOT_APPLICABLE',
      reached: null,
      rawDelta,
    }
  }
  const directionalDelta =
    metric.direction === 'HIGHER_IS_BETTER' ? rawDelta : -rawDelta
  return {
    targetValue: benchmark.targetValue,
    direction: metric.direction,
    status:
      directionalDelta > 0
        ? 'ABOVE_TARGET'
        : directionalDelta < 0
          ? 'BELOW_TARGET'
          : 'ON_TARGET',
    reached: directionalDelta >= 0,
    rawDelta,
    directionalDelta,
    relativeGap:
      benchmark.targetValue === 0
        ? undefined
        : (directionalDelta / Math.abs(benchmark.targetValue)) * 100,
  }
}

export const mean = (values: Array<number | null | undefined>) => {
  const present = values.filter((value): value is number => value != null)
  return present.length
    ? present.reduce((total, value) => total + value, 0) / present.length
    : undefined
}

export const median = (values: Array<number | null | undefined>) => {
  const present = values
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right)
  if (!present.length) return undefined
  const middle = Math.floor(present.length / 2)
  return present.length % 2
    ? present[middle]
    : (present[middle - 1] + present[middle]) / 2
}

export const getLatestComparableResult = (points: PlayerTestHistoryPoint[]) =>
  [...points].sort(
    (a, b) => b.session.date.getTime() - a.session.date.getTime(),
  )[0]

export const getBestResult = (
  points: PlayerTestHistoryPoint[],
  metric: TestMetricDefinition,
) => {
  if (!points.length) return undefined
  if (metric.direction === 'HIGHER_IS_BETTER')
    return points.reduce((best, point) =>
      point.value > best.value ? point : best,
    )
  if (metric.direction === 'LOWER_IS_BETTER')
    return points.reduce((best, point) =>
      point.value < best.value ? point : best,
    )
  return undefined
}

export const buildHistoryPoints = (
  results: TestResult[],
  sessionsById: Map<string, PlayerTestHistoryPoint['session']>,
  metric: TestMetricDefinition,
) =>
  results
    .flatMap((result) => {
      const session = sessionsById.get(result.testSessionId)
      const value = result.values[metric.metricKey]
      return session && value !== undefined
        ? [
            {
              session,
              result,
              metricKey: metric.metricKey,
              unit: metric.unit,
              value,
            },
          ]
        : []
    })
    .sort((a, b) => a.session.date.getTime() - b.session.date.getTime())

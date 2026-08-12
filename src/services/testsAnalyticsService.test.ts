import { describe, expect, it } from 'vitest'
import type { TestMetricDefinition } from '../types/domain'
import {
  buildHistoryPoints,
  compareMetricResults,
  compareToBenchmark,
  getBestResult,
  getLatestComparableResult,
  mean,
  median,
} from './testsAnalyticsService'

const metric = (
  direction: TestMetricDefinition['direction'],
): TestMetricDefinition => ({
  metricKey: 'VALUE',
  label: 'Valeur',
  valueType: 'NUMBER',
  unit: 'SECOND',
  direction,
  required: true,
})
const result = (value: number, overrides = {}) => ({
  testDefinitionId: 'definition',
  testDefinitionVersion: 1,
  metricKey: 'VALUE',
  unit: 'SECOND' as const,
  value,
  ...overrides,
})

describe('testsAnalyticsService', () => {
  it.each([
    ['HIGHER_IS_BETTER', 40, 50, 'IMPROVED'],
    ['LOWER_IS_BETTER', 3.7, 3.5, 'IMPROVED'],
    ['HIGHER_IS_BETTER', 50, 40, 'REGRESSED'],
    ['LOWER_IS_BETTER', 3.4, 3.6, 'REGRESSED'],
    ['HIGHER_IS_BETTER', 50, 50, 'STABLE'],
  ] as const)(
    'interprète %s de %s vers %s',
    (direction, before, after, trend) => {
      expect(
        compareMetricResults(result(before), result(after), metric(direction))
          .trend,
      ).toBe(trend)
    },
  )

  it('conserve zéro et rend le pourcentage non applicable après zéro', () => {
    const comparison = compareMetricResults(
      result(0),
      result(1),
      metric('HIGHER_IS_BETTER'),
    )
    expect(comparison.trend).toBe('IMPROVED')
    expect(comparison.relativeChange).toBeUndefined()
  })

  it('interprète les benchmarks selon leur direction', () => {
    const benchmark = {
      testBenchmarkId: 'benchmark',
      testDefinitionId: 'definition',
      testDefinitionVersion: 1,
      metricKey: 'VALUE',
      subCategoryId: 'u13',
      seasonId: 'season',
      benchmarkLevel: 'TARGET' as const,
      targetValue: 50,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(
      compareToBenchmark(55, benchmark, metric('HIGHER_IS_BETTER')),
    ).toMatchObject({
      reached: true,
      directionalDelta: 5,
      status: 'ABOVE_TARGET',
    })
    expect(
      compareToBenchmark(45, benchmark, metric('LOWER_IS_BETTER')),
    ).toMatchObject({
      reached: true,
      directionalDelta: 5,
      status: 'ABOVE_TARGET',
    })
  })

  it('refuse explicitement version, métrique et unité incompatibles', () => {
    expect(
      compareMetricResults(
        result(1),
        result(2, { testDefinitionVersion: 2 }),
        metric('HIGHER_IS_BETTER'),
      ).compatibility,
    ).toBe('INCOMPATIBLE_VERSION')
    expect(
      compareMetricResults(
        result(1),
        result(2, { metricKey: 'OTHER' }),
        metric('HIGHER_IS_BETTER'),
      ).compatibility,
    ).toBe('INCOMPATIBLE_METRIC')
    expect(
      compareMetricResults(
        result(1),
        result(2, { unit: 'METER' }),
        metric('HIGHER_IS_BETTER'),
      ).compatibility,
    ).toBe('INCOMPATIBLE_UNIT')
  })

  it('calcule moyenne et médiane sans convertir les absences en zéro', () => {
    expect(mean([0, undefined, 10])).toBe(5)
    expect(median([undefined, 9, 1, 5])).toBe(5)
    expect(mean([])).toBeUndefined()
    expect(median([undefined])).toBeUndefined()
  })

  it('sélectionne le meilleur résultat avec zéro selon la direction', () => {
    const now = new Date()
    const points = [0, 2, 1].map((value, index) => ({
      value,
      metricKey: 'VALUE',
      unit: 'SECOND' as const,
      session: {
        date: new Date(now.getTime() + index),
        testSessionId: String(index),
      },
      result: {},
    }))
    expect(
      getBestResult(points as never, metric('HIGHER_IS_BETTER'))?.value,
    ).toBe(2)
    expect(
      getBestResult(points as never, metric('LOWER_IS_BETTER'))?.value,
    ).toBe(0)
  })

  it('ordonne l’historique par date, ignore une métrique absente et trouve la dernière valeur', () => {
    const sessions = new Map(
      [
        ['late', new Date('2026-10-01')],
        ['early', new Date('2026-08-12')],
        ['missing', new Date('2026-09-01')],
      ].map(([testSessionId, date]) => [
        testSessionId as string,
        { testSessionId, date } as never,
      ]),
    )
    const results = [
      { testSessionId: 'late', values: { VALUE: 52 } },
      { testSessionId: 'early', values: { VALUE: 45 } },
      { testSessionId: 'missing', values: {} },
    ] as never
    const points = buildHistoryPoints(
      results,
      sessions,
      metric('HIGHER_IS_BETTER'),
    )
    expect(points.map(({ value }) => value)).toEqual([45, 52])
    expect(getLatestComparableResult(points)?.value).toBe(52)
  })
})

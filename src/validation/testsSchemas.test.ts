import { describe, expect, it } from 'vitest'
import {
  testBenchmarkSchema,
  testDefinitionSchema,
  testMetricDefinitionSchema,
} from './schemas'

const now = new Date('2026-08-01T00:00:00.000Z')
const metric = {
  metricKey: 'STRONG_FOOT',
  label: 'Pied fort',
  valueType: 'NUMBER' as const,
  unit: 'COUNT' as const,
  direction: 'HIGHER_IS_BETTER' as const,
  required: true,
  precision: 0,
  minValue: 0,
}
const definition = {
  testDefinitionId: 'juggling-v1',
  name: 'Jongles',
  code: 'JUGGLING',
  domain: 'TECHNICAL' as const,
  status: 'ACTIVE' as const,
  version: 1,
  metrics: [metric],
  createdAt: now,
  updatedAt: now,
}

describe('schémas Tests PR06', () => {
  it('accepte une TestDefinition versionnée valide', () => {
    expect(testDefinitionSchema.parse(definition)).toEqual(definition)
  })

  it.each(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const)(
    'accepte une définition PR09 au statut %s',
    (status) => {
      const value = {
        ...definition,
        status,
        metrics: status === 'DRAFT' ? [] : definition.metrics,
      }
      expect(testDefinitionSchema.parse(value).status).toBe(status)
    },
  )

  it('refuse une métrique mal structurée', () => {
    expect(() =>
      testMetricDefinitionSchema.parse({
        ...metric,
        metricKey: 'pied fort',
      }),
    ).toThrow()
    expect(() =>
      testMetricDefinitionSchema.parse({
        ...metric,
        minValue: 10,
        maxValue: 5,
      }),
    ).toThrow()
  })

  it('rend la version obligatoire', () => {
    const withoutVersion: Omit<typeof definition, 'version'> = {
      testDefinitionId: definition.testDefinitionId,
      name: definition.name,
      code: definition.code,
      domain: definition.domain,
      status: definition.status,
      metrics: definition.metrics,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    }
    expect(() => testDefinitionSchema.parse(withoutVersion)).toThrow()
  })

  it('accepte les directions haute et basse', () => {
    expect(testMetricDefinitionSchema.parse(metric).direction).toBe(
      'HIGHER_IS_BETTER',
    )
    expect(
      testMetricDefinitionSchema.parse({
        ...metric,
        direction: 'LOWER_IS_BETTER',
      }).direction,
    ).toBe('LOWER_IS_BETTER')
  })

  it('accepte un TestBenchmark versionné et une cible égale à zéro', () => {
    const benchmark = testBenchmarkSchema.parse({
      testBenchmarkId: 'benchmark-u13-juggling',
      testDefinitionId: definition.testDefinitionId,
      testDefinitionVersion: definition.version,
      metricKey: metric.metricKey,
      subCategoryId: 'subcat-u13',
      seasonId: 'season-2026',
      benchmarkLevel: 'TARGET',
      targetValue: 0,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    })
    expect(benchmark.targetValue).toBe(0)
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { TeamAccess, TestBenchmark, TestDefinition } from '../types/domain'
import {
  areTestMetricsComparable,
  createTestsService,
  isTargetReached,
  TestsDomainError,
  validateBenchmarkCompatibility,
} from './testsService'

const now = new Date('2026-08-01T00:00:00.000Z')
const definition: TestDefinition = {
  testDefinitionId: 'sprint-20m-v1',
  name: 'Sprint 20 m',
  code: 'SPRINT_20M',
  domain: 'PHYSICAL',
  status: 'ACTIVE',
  version: 1,
  metrics: [
    {
      metricKey: 'TIME',
      label: 'Temps',
      valueType: 'NUMBER',
      unit: 'SECOND',
      direction: 'LOWER_IS_BETTER',
      required: true,
      precision: 2,
      minValue: 0,
    },
  ],
  createdAt: now,
  updatedAt: now,
}
const benchmark: TestBenchmark = {
  testBenchmarkId: 'benchmark-u13-sprint',
  testDefinitionId: definition.testDefinitionId,
  testDefinitionVersion: 1,
  metricKey: 'TIME',
  subCategoryId: 'subcat-u13',
  seasonId: 'season-2026',
  benchmarkLevel: 'TARGET',
  targetValue: 3.8,
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
}
const accesses: TeamAccess[] = [
  {
    userTeamAccessId: 'user_team',
    userId: 'user',
    teamId: 'team',
    status: 'ACTIVE',
    rolePermissions: {
      coach: { permissions: ['tests.read'], medicalAccessLevel: 'NONE' },
    },
  },
]

describe('testsService', () => {
  it('valide un benchmark compatible avec sa définition', () => {
    expect(
      validateBenchmarkCompatibility(benchmark, definition, ['subcat-u13']),
    ).toEqual(definition.metrics[0])
  })

  it('refuse une metricKey absente', () => {
    expect(() =>
      validateBenchmarkCompatibility(
        { ...benchmark, metricKey: 'DISTANCE' },
        definition,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'BENCHMARK_METRIC_NOT_FOUND' }),
    )
  })

  it('refuse une version de protocole incompatible', () => {
    expect(() =>
      validateBenchmarkCompatibility(
        { ...benchmark, testDefinitionVersion: 2 },
        definition,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'BENCHMARK_VERSION_MISMATCH' }),
    )
  })

  it('refuse une sous-catégorie hors du contexte attendu', () => {
    expect(() =>
      validateBenchmarkCompatibility(benchmark, definition, ['subcat-u14']),
    ).toThrowError(
      expect.objectContaining({ code: 'BENCHMARK_SUBCATEGORY_MISMATCH' }),
    )
  })

  it('applique HIGHER_IS_BETTER et LOWER_IS_BETTER', () => {
    expect(isTargetReached(3.7, 3.8, definition.metrics[0])).toBe(true)
    expect(
      isTargetReached(51, 50, {
        ...definition.metrics[0],
        direction: 'HIGHER_IS_BETTER',
      }),
    ).toBe(true)
  })

  it('conserve 0 comme valeur et distingue null/undefined', () => {
    expect(isTargetReached(0, 0, definition.metrics[0])).toBe(true)
    expect(isTargetReached(null, 0, definition.metrics[0])).toBeNull()
    expect(isTargetReached(undefined, 0, definition.metrics[0])).toBeNull()
  })

  it('compare uniquement définition, version, métrique, unité et direction compatibles', () => {
    const candidate = { definition, metric: definition.metrics[0] }
    expect(areTestMetricsComparable(candidate, candidate)).toBe(true)
    expect(
      areTestMetricsComparable(candidate, {
        definition: { ...definition, version: 2 },
        metric: definition.metrics[0],
      }),
    ).toBe(false)
  })

  it('vérifie tests.read avant toute lecture repository', async () => {
    const repository = {
      getActiveDefinitions: vi.fn().mockResolvedValue([definition]),
      getDefinitionById: vi.fn().mockResolvedValue(definition),
      getBenchmarks: vi.fn().mockResolvedValue([benchmark]),
    }
    const service = createTestsService(repository)
    await expect(
      service.getActiveDefinitions({
        userId: 'user',
        activeRoleId: 'coach',
        teamId: 'team',
        accesses,
      }),
    ).resolves.toEqual([definition])
    await expect(
      service.getActiveDefinitions({
        userId: 'user',
        activeRoleId: 'analyst',
        teamId: 'team',
        accesses,
      }),
    ).rejects.toBeInstanceOf(TestsDomainError)
    expect(repository.getActiveDefinitions).toHaveBeenCalledTimes(1)
  })
})

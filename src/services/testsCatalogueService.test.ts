import { describe, expect, it, vi } from 'vitest'
import type { TestsCatalogueRepository } from '../repositories/testsCatalogueRepository'
import type { TeamAccess, TestDefinition } from '../types/domain'
import {
  TestsCatalogueError,
  benchmarkDocumentId,
  createTestsCatalogueService,
  definitionDocumentId,
  validateDefinitionForActivation,
} from './testsCatalogueService'
import { metricColumns } from './testEntryColumns'
import { compareToBenchmark } from './testsAnalyticsService'

const access = (permissions: string[]): TeamAccess => ({
  userTeamAccessId: 'user_team',
  userId: 'user',
  teamId: 'team',
  status: 'ACTIVE' as const,
  rolePermissions: { role: { permissions, medicalAccessLevel: 'NONE' } },
})
const context = (permissions = ['tests.manage']) => ({
  userId: 'user',
  activeRoleId: 'role',
  teamId: 'team',
  seasonId: 'season',
  categoryId: 'category',
  accesses: [access(permissions)],
})
const definition = (
  overrides: Partial<TestDefinition> = {},
): TestDefinition => ({
  testDefinitionId: 'test-generic-v1',
  name: 'Test générique PR09',
  code: 'GENERIC',
  domain: 'PHYSICAL',
  status: 'DRAFT',
  version: 1,
  metrics: [
    {
      metricKey: 'METRIC_B',
      label: 'B',
      valueType: 'NUMBER',
      unit: 'SECOND',
      direction: 'LOWER_IS_BETTER',
      required: true,
      order: 1,
    },
    {
      metricKey: 'METRIC_A',
      label: 'A',
      valueType: 'NUMBER',
      unit: 'COUNT',
      direction: 'HIGHER_IS_BETTER',
      required: true,
      order: 0,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const repository = (existing = definition()): TestsCatalogueRepository => ({
  listDefinitions: vi.fn(async () => [existing]),
  getDefinition: vi.fn(async () => existing),
  createDefinition: vi.fn(async () => undefined),
  updateDefinition: vi.fn(async () => undefined),
  deleteDefinition: vi.fn(async () => undefined),
  listVersions: vi.fn(async () => [existing]),
  createNextVersion: vi.fn(async () => undefined),
  listBenchmarks: vi.fn(async () => []),
  createBenchmark: vi.fn(async () => undefined),
  getBenchmark: vi.fn(async () => null),
  updateBenchmark: vi.fn(async () => undefined),
  listSubCategories: vi.fn(async () => []),
  getCategory: vi.fn(async () => ({
    categoryId: 'category',
    seasonId: 'season',
    name: 'U13/U14',
    subCategoryIds: ['u13'],
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
})

describe('testsCatalogueService', () => {
  it('sépare tests.manage de tests.write', async () => {
    const service = createTestsCatalogueService(repository())
    await expect(service.list(context(['tests.write']))).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    })
    await expect(
      service.list(context(['tests.read', 'tests.manage'])),
    ).resolves.toHaveLength(1)
  })

  it('refuse une activation sans métrique, avec doublon, bornes ou précision invalides', () => {
    for (const candidate of [
      definition({ metrics: [] }),
      definition({
        metrics: [definition().metrics[0], definition().metrics[0]],
      }),
      definition({
        metrics: [{ ...definition().metrics[0], minValue: 2, maxValue: 1 }],
      }),
      definition({ metrics: [{ ...definition().metrics[0], precision: 7 }] }),
      definition({
        metrics: [{ ...definition().metrics[0], unit: 'BAD' as never }],
      }),
      definition({
        metrics: [{ ...definition().metrics[0], direction: 'BAD' as never }],
      }),
    ])
      expect(() =>
        validateDefinitionForActivation({ ...candidate, status: 'ACTIVE' }),
      ).toThrow(TestsCatalogueError)
  })

  it('interdit la mutation structurelle et la suppression d’une version utilisée', async () => {
    const repo = repository(definition({ status: 'ACTIVE' }))
    const service = createTestsCatalogueService(repo)
    await expect(
      service.updateDraft(context(), 'test-generic-v1', definition()),
    ).rejects.toMatchObject({ code: 'TEST_DEFINITION_IMMUTABLE' })
    await expect(
      service.deleteUnusedDraft(context(), 'test-generic-v1'),
    ).rejects.toMatchObject({ code: 'TEST_DEFINITION_USED' })
  })

  it('crée v2 sans modifier v1 et utilise un ID déterministe concurrent-safe', async () => {
    const v1 = definition({ status: 'ACTIVE' })
    const repo = repository(v1)
    const service = createTestsCatalogueService(repo)
    const v2 = await service.createNextVersion(context(), v1.testDefinitionId)
    expect(v2).toMatchObject({
      version: 2,
      status: 'DRAFT',
      testDefinitionId: definitionDocumentId('GENERIC', 2),
    })
    expect(v1).toMatchObject({ version: 1, status: 'ACTIVE' })
    expect(repo.createNextVersion).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2 }),
    )
  })

  it('empêche le doublon benchmark par ID et accepte targetValue 0', async () => {
    const active = definition({ status: 'ACTIVE' })
    const repo = repository(active)
    const service = createTestsCatalogueService(repo)
    const input = {
      testDefinitionId: active.testDefinitionId,
      testDefinitionVersion: 1,
      metricKey: 'METRIC_A',
      subCategoryId: 'u13',
      seasonId: 'season',
      benchmarkLevel: 'TARGET' as const,
      targetValue: 0,
    }
    const created = await service.createBenchmark(context(), input)
    expect(created.testBenchmarkId).toBe(benchmarkDocumentId(input))
    expect(created.targetValue).toBe(0)
    vi.mocked(repo.createBenchmark).mockRejectedValueOnce(
      new Error('DOCUMENT_ALREADY_EXISTS'),
    )
    await expect(
      service.createBenchmark(context(), input),
    ).rejects.toMatchObject({ code: 'BENCHMARK_DUPLICATE' })
  })

  it('alimente PR07 et PR08 avec un protocole générique sans branche spécifique', () => {
    const generic = definition({ status: 'ACTIVE' })
    const benchmark = (targetValue: number) => ({
      testBenchmarkId: 'benchmark',
      testDefinitionId: generic.testDefinitionId,
      testDefinitionVersion: 1,
      metricKey: 'METRIC_A',
      subCategoryId: 'u13',
      seasonId: 'season',
      benchmarkLevel: 'TARGET' as const,
      targetValue,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(metricColumns(generic).map(({ key }) => key)).toEqual([
      'METRIC_A',
      'METRIC_B',
    ])
    expect(
      compareToBenchmark(10, benchmark(12), generic.metrics[0]),
    ).toMatchObject({
      reached: true,
    })
    expect(
      compareToBenchmark(10, benchmark(0), generic.metrics[1]),
    ).toMatchObject({
      reached: true,
    })
  })
})

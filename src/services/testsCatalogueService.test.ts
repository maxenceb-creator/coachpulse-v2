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

  it('refuse une métrique seulement locale absente de la définition persistée', async () => {
    const repo = repository(definition({ metrics: [] }))
    const service = createTestsCatalogueService(repo)

    await expect(
      service.createBenchmark(context(), {
        testDefinitionId: 'test-generic-v1',
        testDefinitionVersion: 1,
        metricKey: 'HEIGHT',
        subCategoryId: 'u13',
        seasonId: 'season',
        benchmarkLevel: 'TARGET',
        targetValue: 35,
      }),
    ).rejects.toMatchObject({ code: 'BENCHMARK_INVALID' })
    expect(repo.createBenchmark).not.toHaveBeenCalled()
  })

  it('limite la lecture des benchmarks aux sous-catégories de la Category active', async () => {
    const repo = repository()
    const service = createTestsCatalogueService(repo)

    await service.listBenchmarks(context(), 'test-generic-v1', 1)

    expect(repo.listBenchmarks).toHaveBeenCalledWith(
      'test-generic-v1',
      1,
      'season',
      ['u13'],
    )
  })

  it('charge les sous-catégories canoniques de la Category et de la saison', async () => {
    const repo = repository()
    vi.mocked(repo.getCategory).mockResolvedValue({
      categoryId: 'category',
      seasonId: 'season',
      name: 'Formation',
      subCategoryIds: ['subcat-u14-2026', 'subcat-u13-2026'],
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(repo.listSubCategories).mockResolvedValue([
      {
        subCategoryId: 'subcat-u14-2026',
        seasonId: 'season',
        name: 'U14F',
        birthYearRule: 2013,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subCategoryId: 'subcat-u13-2026',
        seasonId: 'season',
        name: 'U13F',
        birthYearRule: 2014,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result =
      await createTestsCatalogueService(repo).subCategories(context())

    expect(repo.listSubCategories).toHaveBeenCalledWith('season', [
      'subcat-u14-2026',
      'subcat-u13-2026',
    ])
    expect(result.map(({ subCategoryId }) => subCategoryId)).toEqual([
      'subcat-u13-2026',
      'subcat-u14-2026',
    ])
  })

  it('autorise des TARGET U13 et U14 distincts pour la même métrique', () => {
    const base = {
      seasonId: 'season-2026',
      testDefinitionId: 'test-vertical-jump-v1',
      testDefinitionVersion: 1,
      metricKey: 'HEIGHT',
      benchmarkLevel: 'TARGET' as const,
    }
    expect(
      benchmarkDocumentId({
        ...base,
        subCategoryId: 'subcat-u13-2026',
      }),
    ).not.toBe(
      benchmarkDocumentId({
        ...base,
        subCategoryId: 'subcat-u14-2026',
      }),
    )
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

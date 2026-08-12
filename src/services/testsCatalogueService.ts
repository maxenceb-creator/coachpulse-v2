import type { TestsCatalogueRepository } from '../repositories/testsCatalogueRepository'
import type {
  TeamAccess,
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
} from '../types/domain'
import { testDefinitionSchema } from '../validation/schemas'
import { hasPermission } from './permissionsService'
import type { TestsSecurityContext } from './testsService'

export class TestsCatalogueError extends Error {
  constructor(
    public readonly code:
      | 'PERMISSION_DENIED'
      | 'TEST_DEFINITION_NOT_FOUND'
      | 'TEST_DEFINITION_INVALID'
      | 'TEST_DEFINITION_IMMUTABLE'
      | 'TEST_DEFINITION_USED'
      | 'TEST_VERSION_CONFLICT'
      | 'BENCHMARK_INVALID'
      | 'BENCHMARK_DUPLICATE',
  ) {
    super(code)
  }
}

export type CatalogueSecurityContext = TestsSecurityContext & {
  seasonId: string
  categoryId: string
}

const requireManage = (
  context: Pick<
    TestsSecurityContext,
    'userId' | 'activeRoleId' | 'teamId' | 'accesses'
  >,
) => {
  if (
    !hasPermission(context.accesses, {
      userId: context.userId,
      activeRoleId: context.activeRoleId,
      teamId: context.teamId,
      permissionKey: 'tests.manage',
    })
  )
    throw new TestsCatalogueError('PERMISSION_DENIED')
}

export const sortTestMetrics = (metrics: TestMetricDefinition[]) =>
  metrics
    .map((metric, index) => ({ ...metric, order: metric.order ?? index }))
    .sort((a, b) => a.order - b.order)

export const validateDefinitionForActivation = (definition: TestDefinition) => {
  const candidate = {
    ...definition,
    metrics: sortTestMetrics(definition.metrics),
  }
  const result = testDefinitionSchema.safeParse(candidate)
  if (!result.success || !candidate.name.trim() || !candidate.code.trim())
    throw new TestsCatalogueError('TEST_DEFINITION_INVALID')
  if (!candidate.metrics.length)
    throw new TestsCatalogueError('TEST_DEFINITION_INVALID')
  if (
    new Set(candidate.metrics.map((metric) => metric.order)).size !==
    candidate.metrics.length
  )
    throw new TestsCatalogueError('TEST_DEFINITION_INVALID')
  return candidate
}

export const definitionDocumentId = (code: string, version: number) =>
  `test-${code
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')}-v${version}`

export const benchmarkDocumentId = (
  benchmark: Pick<
    TestBenchmark,
    | 'seasonId'
    | 'subCategoryId'
    | 'testDefinitionId'
    | 'testDefinitionVersion'
    | 'metricKey'
    | 'benchmarkLevel'
  >,
) =>
  [
    'benchmark',
    benchmark.seasonId,
    benchmark.subCategoryId,
    benchmark.testDefinitionId,
    `v${benchmark.testDefinitionVersion}`,
    benchmark.metricKey,
    benchmark.benchmarkLevel,
  ].join('_')

export type DefinitionDraftInput = Pick<
  TestDefinition,
  'name' | 'code' | 'domain' | 'metrics'
> & { description?: string }

export const createTestsCatalogueService = (
  repository: TestsCatalogueRepository,
) => {
  const allowedSubCategoryIds = async (context: CatalogueSecurityContext) => {
    const category = await repository.getCategory(context.categoryId)
    if (!category || category.seasonId !== context.seasonId)
      throw new TestsCatalogueError('BENCHMARK_INVALID')
    return category.subCategoryIds
  }
  const isConflict = (error: unknown) =>
    error instanceof Error && error.message === 'DOCUMENT_ALREADY_EXISTS'
  return {
    async list(context: CatalogueSecurityContext) {
      requireManage(context)
      return (await repository.listDefinitions()).sort(
        (a, b) => a.name.localeCompare(b.name) || b.version - a.version,
      )
    },
    async get(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      const definition = await repository.getDefinition(id)
      if (!definition)
        throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      return { definition }
    },
    async create(
      context: CatalogueSecurityContext,
      input: DefinitionDraftInput,
    ) {
      requireManage(context)
      const now = new Date()
      const definition: TestDefinition = {
        ...input,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        testDefinitionId: definitionDocumentId(
          input.code.trim().toUpperCase(),
          1,
        ),
        version: 1,
        status: 'DRAFT',
        metrics: sortTestMetrics(input.metrics),
        createdBy: context.userId,
        createdAt: now,
        updatedAt: now,
      }
      if (!testDefinitionSchema.safeParse(definition).success)
        throw new TestsCatalogueError('TEST_DEFINITION_INVALID')
      try {
        await repository.createDefinition(definition)
      } catch (error) {
        if (isConflict(error))
          throw new TestsCatalogueError('TEST_VERSION_CONFLICT')
        throw error
      }
      return definition
    },
    async updateDraft(
      context: CatalogueSecurityContext,
      id: string,
      input: DefinitionDraftInput,
    ) {
      requireManage(context)
      const existing = await repository.getDefinition(id)
      if (!existing) throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      if (existing.status !== 'DRAFT')
        throw new TestsCatalogueError('TEST_DEFINITION_IMMUTABLE')
      if (input.code.trim().toUpperCase() !== existing.code)
        throw new TestsCatalogueError('TEST_DEFINITION_IMMUTABLE')
      const updated = {
        ...existing,
        ...input,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        metrics: sortTestMetrics(input.metrics),
        updatedAt: new Date(),
      }
      if (!testDefinitionSchema.safeParse(updated).success)
        throw new TestsCatalogueError('TEST_DEFINITION_INVALID')
      await repository.updateDefinition(id, {
        name: updated.name,
        description: updated.description,
        domain: updated.domain,
        metrics: updated.metrics,
      })
      return updated
    },
    async activate(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      const existing = await repository.getDefinition(id)
      if (!existing) throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      if (existing.status !== 'DRAFT')
        throw new TestsCatalogueError('TEST_DEFINITION_IMMUTABLE')
      const active = validateDefinitionForActivation({
        ...existing,
        status: 'ACTIVE',
      })
      await repository.updateDefinition(id, {
        status: 'ACTIVE',
        metrics: active.metrics,
      })
      return active
    },
    async createNextVersion(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      const source = await repository.getDefinition(id)
      if (!source) throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      const versions = (await repository.listVersions(source.code)).filter(
        ({ code }) => code === source.code,
      )
      const version =
        Math.max(...versions.map((item) => item.version), source.version) + 1
      const now = new Date()
      const next: TestDefinition = {
        ...source,
        testDefinitionId: definitionDocumentId(source.code, version),
        version,
        status: 'DRAFT',
        metrics: sortTestMetrics(source.metrics),
        createdBy: context.userId,
        createdAt: now,
        updatedAt: now,
      }
      try {
        await repository.createNextVersion(next)
      } catch (error) {
        if (isConflict(error))
          throw new TestsCatalogueError('TEST_VERSION_CONFLICT')
        throw error
      }
      return next
    },
    async archive(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      const existing = await repository.getDefinition(id)
      if (!existing) throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      await repository.updateDefinition(id, { status: 'ARCHIVED' })
    },
    async deleteUnusedDraft(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      const existing = await repository.getDefinition(id)
      if (!existing) throw new TestsCatalogueError('TEST_DEFINITION_NOT_FOUND')
      if (existing.status !== 'DRAFT')
        throw new TestsCatalogueError('TEST_DEFINITION_USED')
      await repository.deleteDefinition(id)
    },
    async listBenchmarks(
      context: CatalogueSecurityContext,
      id: string,
      version: number,
    ) {
      requireManage(context)
      return repository.listBenchmarks(
        id,
        version,
        context.seasonId,
        await allowedSubCategoryIds(context),
      )
    },
    async createBenchmark(
      context: CatalogueSecurityContext,
      input: Omit<
        TestBenchmark,
        'testBenchmarkId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'
      >,
    ) {
      requireManage(context)
      const definition = await repository.getDefinition(input.testDefinitionId)
      if (!definition || definition.version !== input.testDefinitionVersion)
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      const metric = definition.metrics.find(
        ({ metricKey }) => metricKey === input.metricKey,
      )
      if (!metric) throw new TestsCatalogueError('BENCHMARK_INVALID')
      const allowedIds = await allowedSubCategoryIds(context)
      if (
        input.seasonId !== context.seasonId ||
        !allowedIds.includes(input.subCategoryId)
      )
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      if (!Number.isFinite(input.targetValue))
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      if (
        (metric.minValue !== undefined &&
          input.targetValue < metric.minValue) ||
        (metric.maxValue !== undefined &&
          input.targetValue > metric.maxValue) ||
        (metric.precision !== undefined &&
          (String(input.targetValue).split('.')[1] ?? '').length >
            metric.precision)
      )
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      const now = new Date()
      const benchmark: TestBenchmark = {
        ...input,
        testBenchmarkId: benchmarkDocumentId(input),
        status: 'ACTIVE',
        createdBy: context.userId,
        createdAt: now,
        updatedAt: now,
      }
      try {
        await repository.createBenchmark(benchmark)
      } catch (error) {
        if (isConflict(error))
          throw new TestsCatalogueError('BENCHMARK_DUPLICATE')
        throw error
      }
      return benchmark
    },
    async updateBenchmark(
      context: CatalogueSecurityContext,
      id: string,
      input: { targetValue: number; label?: string },
    ) {
      requireManage(context)
      const existing = await repository.getBenchmark(id)
      if (!existing || existing.status !== 'ACTIVE')
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      const definition = await repository.getDefinition(
        existing.testDefinitionId,
      )
      const metric = definition?.metrics.find(
        ({ metricKey }) => metricKey === existing.metricKey,
      )
      if (
        !definition ||
        definition.version !== existing.testDefinitionVersion ||
        !metric ||
        existing.seasonId !== context.seasonId ||
        !(await allowedSubCategoryIds(context)).includes(
          existing.subCategoryId,
        ) ||
        !Number.isFinite(input.targetValue) ||
        (metric.minValue !== undefined &&
          input.targetValue < metric.minValue) ||
        (metric.maxValue !== undefined && input.targetValue > metric.maxValue)
      )
        throw new TestsCatalogueError('BENCHMARK_INVALID')
      await repository.updateBenchmark(id, {
        targetValue: input.targetValue,
        ...(input.label?.trim() ? { label: input.label.trim() } : {}),
      })
    },
    async archiveBenchmark(context: CatalogueSecurityContext, id: string) {
      requireManage(context)
      await repository.updateBenchmark(id, { status: 'ARCHIVED' })
    },
    async subCategories(context: CatalogueSecurityContext) {
      requireManage(context)
      return (
        await repository.listSubCategories(
          context.seasonId,
          await allowedSubCategoryIds(context),
        )
      ).sort((left, right) => left.name.localeCompare(right.name))
    },
  }
}

export const canManageTests = (
  accesses: TeamAccess[],
  context: { userId: string; activeRoleId: string; teamId: string },
) => hasPermission(accesses, { ...context, permissionKey: 'tests.manage' })

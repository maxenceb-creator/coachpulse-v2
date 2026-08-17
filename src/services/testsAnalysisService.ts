import type { TestsAnalyticsRepository } from '../repositories/testsRepository'
import type {
  Assignment,
  Player,
  SubCategory,
  TeamAccess,
  TestBenchmark,
} from '../types/domain'
import { hasPermission } from './permissionsService'
import {
  buildHistoryPoints,
  compareMetricResults,
  compareToBenchmark,
  getBestResult,
  getLatestComparableResult,
  mean,
  median,
} from './testsAnalyticsService'
import { TestsDomainError } from './testsService'
import { ZodError } from 'zod'

export type TestAnalysisContext = {
  userId: string
  activeRoleId: string
  teamId: string
  seasonId: string
  accesses: TeamAccess[]
}

export type TestAnalysisFilters = {
  testDefinitionId: string
  testDefinitionVersion: number
  playerId?: string
  metricKey?: string
  from?: Date
  to?: Date
}

type Repository = TestsAnalyticsRepository & {
  activePlayers(playerIds: string[]): Promise<Player[]>
  assignmentsForTeam(teamId: string, seasonId: string): Promise<Assignment[]>
}

type AnalysisOperation = {
  operation: string
  collection: string
}

const runAnalysisOperation = async <T>(
  details: AnalysisOperation,
  run: () => Promise<T>,
) => {
  try {
    return await run()
  } catch (error) {
    if (import.meta.env.DEV) {
      const failure = error as Error & { code?: string }
      console.error('[TestAnalysis DEV] Erreur', {
        ...details,
        layer:
          error instanceof ZodError
            ? 'ZOD'
            : failure.code
              ? 'FIRESTORE'
              : 'repository',
        code: failure.code ?? 'UNKNOWN',
        message: failure.message,
        zodIssues: error instanceof ZodError ? error.issues : undefined,
        error,
      })
    }
    throw error
  }
}

const requireRead = (context: TestAnalysisContext) => {
  if (
    !hasPermission(context.accesses, {
      userId: context.userId,
      activeRoleId: context.activeRoleId,
      teamId: context.teamId,
      permissionKey: 'tests.read',
    })
  )
    throw new TestsDomainError('PERMISSION_DENIED')
}

export const resolveHistoricalSubCategory = (
  player: Player,
  subCategories: SubCategory[],
) =>
  subCategories.find(
    ({ birthYearRule }) => birthYearRule === player.birthDate.getUTCFullYear(),
  )

export const createTestsAnalysisService = (repository: Repository) => ({
  async getDefinitionAnalysis(
    context: TestAnalysisContext,
    filters: TestAnalysisFilters,
  ) {
    const diagnostic = {
      activeRoleId: context.activeRoleId,
      teamId: context.teamId,
      seasonId: context.seasonId,
      testDefinitionId: filters.testDefinitionId,
      playerId: filters.playerId,
      securityContextReady: true,
      queries: [
        {
          collection: 'testSessions',
          where: [
            ['teamId', '==', context.teamId],
            ['seasonId', '==', context.seasonId],
            ['testDefinitionId', '==', filters.testDefinitionId],
            ['testDefinitionVersion', '==', filters.testDefinitionVersion],
            ['status', '==', 'COMPLETED'],
          ],
          orderBy: ['date', 'desc'],
          limit: 100,
        },
        {
          collection: 'testResults',
          where: [
            ['teamId', '==', context.teamId],
            ['seasonId', '==', context.seasonId],
            ['testDefinitionId', '==', filters.testDefinitionId],
            ['testDefinitionVersion', '==', filters.testDefinitionVersion],
          ],
          orderBy: null,
          limit: 500,
        },
      ],
    }
    if (import.meta.env.DEV)
      console.debug('[TestAnalysis DEV] Requête', diagnostic)
    requireRead(context)
    const definition = await runAnalysisOperation(
      { operation: 'getDefinitionById', collection: 'testDefinitions' },
      () => repository.getDefinitionById(filters.testDefinitionId),
    )
    if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    if (definition.version !== filters.testDefinitionVersion)
      throw new TestsDomainError('TEST_DEFINITION_VERSION_MISMATCH')
    const metric = filters.metricKey
      ? definition.metrics.find(
          ({ metricKey }) => metricKey === filters.metricKey,
        )
      : definition.metrics[0]
    if (!metric) throw new TestsDomainError('METRIC_NOT_FOUND')

    const [allSessions, allResults] = await Promise.all([
      runAnalysisOperation(
        {
          operation: 'listCompletedSessionsByDefinition',
          collection: 'testSessions',
        },
        () =>
          repository.listCompletedSessionsByDefinition(
            context.teamId,
            context.seasonId,
            definition.testDefinitionId,
            definition.version,
          ),
      ),
      runAnalysisOperation(
        {
          operation: 'listResultsByDefinition',
          collection: 'testResults',
        },
        () =>
          repository.listResultsByDefinition(
            context.teamId,
            context.seasonId,
            definition.testDefinitionId,
            definition.version,
          ),
      ),
    ])
    const sessions = allSessions.filter(
      ({ date }) =>
        (!filters.from || date >= filters.from) &&
        (!filters.to || date <= filters.to),
    )
    const sessionsById = new Map(
      sessions.map((session) => [session.testSessionId, session]),
    )
    const results = allResults.filter(
      ({ testSessionId, playerId }) =>
        sessionsById.has(testSessionId) &&
        (!filters.playerId || filters.playerId === playerId),
    )
    const assignments = await runAnalysisOperation(
      {
        operation: 'assignmentsForTeam',
        collection: 'playerTeamAssignments',
      },
      () => repository.assignmentsForTeam(context.teamId, context.seasonId),
    )
    const now = new Date()
    const scopedPlayerIds = new Set(
      assignments
        .filter(
          ({ startDate, endDate }) =>
            startDate <= now && (!endDate || endDate >= now),
        )
        .map(({ playerId }) => playerId),
    )
    const playerIds = [
      ...new Set(
        results
          .map(({ playerId }) => playerId)
          .filter((playerId) => scopedPlayerIds.has(playerId)),
      ),
    ]
    const players = await runAnalysisOperation(
      { operation: 'activePlayers', collection: 'players' },
      () => repository.activePlayers(playerIds),
    )
    const categoryId = sessions[0]?.categoryId
    const category = categoryId
      ? await runAnalysisOperation(
          { operation: 'getCategory', collection: 'categories' },
          () => repository.getCategory(categoryId),
        )
      : null
    const subCategories = category
      ? await runAnalysisOperation(
          { operation: 'getSubCategories', collection: 'subCategories' },
          () => repository.getSubCategories(category.subCategoryIds),
        )
      : []
    const benchmarksBySubCategory = new Map<string, TestBenchmark[]>()
    await Promise.all(
      subCategories.map(async ({ subCategoryId }) => {
        const benchmarks = await runAnalysisOperation(
          { operation: 'getBenchmarks', collection: 'testBenchmarks' },
          () =>
            repository.getBenchmarks({
              subCategoryId,
              seasonId: context.seasonId,
              testDefinitionId: definition.testDefinitionId,
            }),
        )
        benchmarksBySubCategory.set(
          subCategoryId,
          benchmarks.filter(
            (benchmark) =>
              benchmark.testDefinitionVersion === definition.version &&
              benchmark.metricKey === metric.metricKey,
          ),
        )
      }),
    )
    const histories = players.map((player) => {
      const points = buildHistoryPoints(
        results.filter(({ playerId }) => playerId === player.playerId),
        sessionsById,
        metric,
      )
      const subCategory = resolveHistoricalSubCategory(player, subCategories)
      const latest = getLatestComparableResult(points)
      const previous = points.length > 1 ? points.at(-2) : undefined
      const comparable = (point: NonNullable<typeof latest>) => ({
        testDefinitionId: point.result.testDefinitionId,
        testDefinitionVersion: point.result.testDefinitionVersion,
        metricKey: point.metricKey,
        unit: point.unit,
        value: point.value,
      })
      const benchmark = subCategory
        ? benchmarksBySubCategory.get(subCategory.subCategoryId)?.[0]
        : undefined
      return {
        player,
        subCategory,
        benchmark,
        points,
        latest,
        best: getBestResult(points, metric),
        average: mean(points.map(({ value }) => value)),
        median: median(points.map(({ value }) => value)),
        progression:
          previous && latest
            ? compareMetricResults(
                comparable(previous),
                comparable(latest),
                metric,
              )
            : undefined,
        benchmarkComparison:
          latest && benchmark
            ? compareToBenchmark(latest.value, benchmark, metric)
            : undefined,
      }
    })
    const analysis = { definition, metric, sessions, histories }
    if (import.meta.env.DEV)
      console.debug('[TestAnalysis DEV] Succès', {
        ...diagnostic,
        sessionCount: sessions.length,
        resultCount: results.length,
        playerCount: players.length,
        benchmarkCount: histories.filter(({ benchmark }) => !!benchmark).length,
      })
    return analysis
  },
})

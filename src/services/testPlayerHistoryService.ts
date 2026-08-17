import type { TestPlayerHistoryRepository } from '../repositories/testsRepository'
import type {
  Assignment,
  SubCategory,
  Player,
  TeamAccess,
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import { isAssignmentEffective } from './assignmentsService'
import { hasPermission } from './permissionsService'
import {
  buildHistoryPoints,
  compareMetricResults,
  compareToBenchmark,
  getBestResult,
  getLatestComparableResult,
  mean,
} from './testsAnalyticsService'
import { TestsDomainError } from './testsService'

export type TestPlayerHistoryContext = {
  userId: string
  activeRoleId: string
  teamId: string
  seasonId: string
  accesses: TeamAccess[]
}

type Repository = TestPlayerHistoryRepository & {
  assignmentsForTeam(teamId: string, seasonId: string): Promise<Assignment[]>
  activePlayers(playerIds: string[]): Promise<Player[]>
}

const requireRead = (context: TestPlayerHistoryContext) => {
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

const comparable = (point: ReturnType<typeof buildHistoryPoints>[number]) => ({
  testDefinitionId: point.result.testDefinitionId,
  testDefinitionVersion: point.result.testDefinitionVersion,
  metricKey: point.metricKey,
  unit: point.unit,
  value: point.value,
})

export const summarizeMetric = (
  metric: TestMetricDefinition,
  points: ReturnType<typeof buildHistoryPoints>,
  benchmarks: TestBenchmark[] = [],
) => {
  const first = points[0]
  const latest = getLatestComparableResult(points)
  return {
    metric,
    points,
    first,
    latest,
    best: getBestResult(points, metric),
    average: mean(points.map(({ value }) => value)),
    count: points.length,
    evolution:
      points.length > 1 && first && latest
        ? compareMetricResults(comparable(first), comparable(latest), metric)
        : undefined,
    benchmarks: benchmarks.map((benchmark) => ({
      benchmark,
      comparison: latest
        ? compareToBenchmark(latest.value, benchmark, metric)
        : undefined,
    })),
  }
}

export const buildPlayerHistory = ({
  player,
  subCategory,
  results,
  sessions,
  definitions,
  benchmarks,
}: {
  player: Player
  subCategory?: SubCategory
  results: TestResult[]
  sessions: TestSession[]
  definitions: TestDefinition[]
  benchmarks: TestBenchmark[]
}) => {
  const sessionsById = new Map(
    sessions.map((session) => [session.testSessionId, session]),
  )
  const completedResults = results.filter((result) =>
    sessionsById.has(result.testSessionId),
  )
  const histories = definitions
    .map((definition) => {
      const definitionResults = completedResults.filter(
        (result) =>
          result.testDefinitionId === definition.testDefinitionId &&
          result.testDefinitionVersion === definition.version,
      )
      return {
        definition,
        metrics: [...definition.metrics]
          .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
          .map((metric) =>
            summarizeMetric(
              metric,
              buildHistoryPoints(definitionResults, sessionsById, metric),
              benchmarks.filter(
                (benchmark) =>
                  benchmark.testDefinitionId === definition.testDefinitionId &&
                  benchmark.testDefinitionVersion === definition.version &&
                  benchmark.metricKey === metric.metricKey,
              ),
            ),
          ),
      }
    })
    .filter(({ metrics }) => metrics.some(({ count }) => count > 0))
    .sort(
      (a, b) =>
        a.definition.name.localeCompare(b.definition.name) ||
        b.definition.version - a.definition.version,
    )
  return { player, subCategory, histories }
}

export const createTestPlayerHistoryService = (repository: Repository) => ({
  async listScopedPlayers(context: TestPlayerHistoryContext) {
    requireRead(context)
    const assignments = await repository.assignmentsForTeam(
      context.teamId,
      context.seasonId,
    )
    const playerIds = [
      ...new Set(
        assignments
          .filter((assignment) => isAssignmentEffective(assignment, new Date()))
          .map(({ playerId }) => playerId),
      ),
    ]
    return repository.activePlayers(playerIds)
  },

  async listCompletedSessions(context: TestPlayerHistoryContext) {
    requireRead(context)
    return repository.listCompletedSessions(context.teamId, context.seasonId)
  },

  async listPlayerResults(context: TestPlayerHistoryContext, playerId: string) {
    requireRead(context)
    return repository.listResultsByPlayer(
      playerId,
      context.teamId,
      context.seasonId,
    )
  },

  async getDefinition(
    context: TestPlayerHistoryContext,
    testDefinitionId: string,
  ) {
    requireRead(context)
    const definition = await repository.getDefinitionById(testDefinitionId)
    if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    return definition
  },

  async getTaxonomy(context: TestPlayerHistoryContext, categoryId?: string) {
    requireRead(context)
    const category = categoryId
      ? await repository.getCategory(categoryId)
      : null
    const subCategories = category
      ? await repository.getSubCategories(category.subCategoryIds)
      : []
    return { category, subCategories }
  },

  async getBenchmarks(
    context: TestPlayerHistoryContext,
    subCategoryId: string,
  ) {
    requireRead(context)
    return repository.getBenchmarks({
      subCategoryId,
      seasonId: context.seasonId,
    })
  },
})

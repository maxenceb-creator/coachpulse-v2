import type {
  TeamAccess,
  Player,
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import type {
  TestBenchmarksQuery,
  TestsRepository,
} from '../repositories/testsRepository'
import { hasPermission } from './permissionsService'
import { isAssignmentEffective } from './assignmentsService'
import type { Assignment } from '../types/domain'

export type TestsSecurityContext = {
  userId: string
  activeRoleId: string
  teamId: string
  accesses: TeamAccess[]
}

type TestSessionDeleteStage =
  'load-session' | 'load-results' | 'delete-results' | 'delete-session'

const logDeleteFailure = (
  testSessionId: string,
  stage: TestSessionDeleteStage,
  error: unknown,
  details: { status?: TestSession['status']; resultCount?: number } = {},
) => {
  if (!import.meta.env.DEV) return
  const failure = error as Error & { code?: string }
  console.error('[TestSession DEV] Suppression échouée', {
    testSessionId,
    status: details.status ?? 'UNKNOWN',
    resultCount: details.resultCount ?? 'UNKNOWN',
    stage,
    code: failure.code ?? 'UNKNOWN',
    message: failure.message,
    error,
  })
}

export class TestsDomainError extends Error {
  constructor(
    public readonly code:
      | 'PERMISSION_DENIED'
      | 'TEST_DEFINITION_NOT_FOUND'
      | 'BENCHMARK_METRIC_NOT_FOUND'
      | 'BENCHMARK_VERSION_MISMATCH'
      | 'BENCHMARK_SUBCATEGORY_MISMATCH'
      | 'BENCHMARK_VALUE_OUT_OF_RANGE'
      | 'TEST_SESSION_NOT_FOUND'
      | 'TEST_SESSION_NOT_EDITABLE'
      | 'TEST_SESSION_DELETE_TOO_LARGE'
      | 'TEST_DEFINITION_VERSION_MISMATCH'
      | 'TEST_CONTEXT_MISMATCH'
      | 'PLAYER_NOT_ELIGIBLE'
      | 'METRIC_NOT_FOUND'
      | 'METRIC_VALUE_OUT_OF_RANGE'
      | 'METRIC_PRECISION_INVALID'
      | 'REQUIRED_METRIC_MISSING',
  ) {
    super(code)
  }
}

const requireTestsWrite = (context: TestsSecurityContext) => {
  if (
    !hasPermission(context.accesses, {
      userId: context.userId,
      activeRoleId: context.activeRoleId,
      teamId: context.teamId,
      permissionKey: 'tests.write',
    })
  ) {
    throw new TestsDomainError('PERMISSION_DENIED')
  }
}

export const validateTestValues = (
  values: Record<string, number | undefined>,
  definition: TestDefinition,
  requireComplete: boolean,
) => {
  const metrics = new Map(
    definition.metrics.map((metric) => [metric.metricKey, metric]),
  )
  for (const [metricKey, value] of Object.entries(values)) {
    const metric = metrics.get(metricKey)
    if (!metric) throw new TestsDomainError('METRIC_NOT_FOUND')
    if (value === undefined) continue
    if (!Number.isFinite(value))
      throw new TestsDomainError('METRIC_VALUE_OUT_OF_RANGE')
    if (
      (metric.minValue !== undefined && value < metric.minValue) ||
      (metric.maxValue !== undefined && value > metric.maxValue)
    )
      throw new TestsDomainError('METRIC_VALUE_OUT_OF_RANGE')
    const decimals = (String(value).split('.')[1] ?? '').length
    if (metric.precision !== undefined && decimals > metric.precision)
      throw new TestsDomainError('METRIC_PRECISION_INVALID')
  }
  if (
    requireComplete &&
    definition.metrics.some(
      (metric) => metric.required && values[metric.metricKey] === undefined,
    )
  )
    throw new TestsDomainError('REQUIRED_METRIC_MISSING')
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, number] => entry[1] !== undefined,
    ),
  )
}

type TestsServiceRepository = TestsRepository & {
  assignmentsForTeam(teamId: string, seasonId: string): Promise<Assignment[]>
  activePlayers(playerIds: string[]): Promise<Player[]>
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

export const createTestsService = (repository: TestsServiceRepository) => ({
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
  async getDefinitionForSession(
    context: TestsSecurityContext,
    session: TestSession,
  ) {
    requireTestsRead(context)
    if (session.teamId !== context.teamId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    const definition = await repository.getDefinitionById(
      session.testDefinitionId,
    )
    if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    if (definition.version !== session.testDefinitionVersion)
      throw new TestsDomainError('TEST_DEFINITION_VERSION_MISMATCH')
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
  async listSessions(context: TestsSecurityContext, seasonId: string) {
    requireTestsRead(context)
    return repository.listSessions(context.teamId, seasonId)
  },
  async getSession(context: TestsSecurityContext, testSessionId: string) {
    requireTestsRead(context)
    const session = await repository.getSessionById(testSessionId)
    if (!session) throw new TestsDomainError('TEST_SESSION_NOT_FOUND')
    if (session.teamId !== context.teamId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    return session
  },
  async createSession(
    context: TestsSecurityContext,
    input: {
      testSessionId: string
      testDefinitionId: string
      testDefinitionVersion: number
      teamId: string
      seasonId: string
      categoryId: string
      date: Date
    },
  ) {
    requireTestsWrite(context)
    if (input.teamId !== context.teamId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    const definition = await repository.getDefinitionById(
      input.testDefinitionId,
    )
    if (!definition) throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    if (definition.version !== input.testDefinitionVersion)
      throw new TestsDomainError('TEST_DEFINITION_VERSION_MISMATCH')
    if (definition.status !== 'ACTIVE')
      throw new TestsDomainError('TEST_DEFINITION_NOT_FOUND')
    const now = new Date()
    const session: TestSession = {
      ...input,
      status: 'DRAFT',
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
    }
    await repository.createSession(session)
    return session
  },
  async getEligiblePlayers(
    context: TestsSecurityContext,
    session: TestSession,
  ) {
    requireTestsRead(context)
    if (session.teamId !== context.teamId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    const assignments = await repository.assignmentsForTeam(
      session.teamId,
      session.seasonId,
    )
    const ids = [
      ...new Set(
        assignments
          .filter((assignment) =>
            isAssignmentEffective(assignment, session.date),
          )
          .map((assignment) => assignment.playerId),
      ),
    ]
    return repository.activePlayers(ids)
  },
  async getResults(context: TestsSecurityContext, session: TestSession) {
    requireTestsRead(context)
    if (session.teamId !== context.teamId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    return repository.getResultsBySession(
      session.testSessionId,
      session.teamId,
      session.seasonId,
    )
  },
  async deleteSession(
    context: TestsSecurityContext,
    testSessionId: string,
    seasonId: string,
  ) {
    requireTestsWrite(context)
    let session: TestSession | null
    try {
      session = await repository.getSessionById(testSessionId)
    } catch (error) {
      logDeleteFailure(testSessionId, 'load-session', error)
      throw error
    }
    if (!session) throw new TestsDomainError('TEST_SESSION_NOT_FOUND')
    if (session.teamId !== context.teamId || session.seasonId !== seasonId)
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    let results: TestResult[]
    try {
      results = await repository.getResultsForDeletion(
        session.testSessionId,
        session.teamId,
        session.seasonId,
      )
    } catch (error) {
      logDeleteFailure(testSessionId, 'load-results', error, {
        status: session.status,
      })
      throw error
    }
    if (results.length > 499)
      throw new TestsDomainError('TEST_SESSION_DELETE_TOO_LARGE')
    try {
      await repository.deleteSessionWithResults(session, results)
    } catch (error) {
      // Les deux suppressions appartiennent au même batch : Firestore ne peut
      // pas identifier un document fautif sans rejeter l'ensemble atomique.
      logDeleteFailure(
        testSessionId,
        results.length ? 'delete-results' : 'delete-session',
        error,
        { status: session.status, resultCount: results.length },
      )
      throw error
    }
    if (import.meta.env.DEV) {
      console.debug('[TestSession DEV] Suppression réussie', {
        testSessionId,
        status: session.status,
        resultCount: results.length,
      })
    }
    return session
  },
  async saveResults(
    context: TestsSecurityContext,
    session: TestSession,
    definition: TestDefinition,
    players: Player[],
    drafts: { playerId: string; values: Record<string, number | undefined> }[],
    complete = false,
  ) {
    requireTestsWrite(context)
    if (session.status !== 'DRAFT')
      throw new TestsDomainError('TEST_SESSION_NOT_EDITABLE')
    if (
      session.teamId !== context.teamId ||
      definition.testDefinitionId !== session.testDefinitionId ||
      definition.version !== session.testDefinitionVersion
    )
      throw new TestsDomainError('TEST_CONTEXT_MISMATCH')
    const allowed = new Map(players.map((player) => [player.playerId, player]))
    const existing = new Map(
      (
        await repository.getResultsBySession(
          session.testSessionId,
          session.teamId,
          session.seasonId,
        )
      ).map((result) => [result.playerId, result]),
    )
    const now = new Date()
    const results: TestResult[] = drafts
      .filter(({ values }) =>
        Object.values(values).some((value) => value !== undefined),
      )
      .map(({ playerId, values }) => {
        const player = allowed.get(playerId)
        if (!player) throw new TestsDomainError('PLAYER_NOT_ELIGIBLE')
        const previous = existing.get(playerId)
        return {
          testResultId: `${session.testSessionId}_${playerId}`,
          testSessionId: session.testSessionId,
          testDefinitionId: session.testDefinitionId,
          testDefinitionVersion: session.testDefinitionVersion,
          playerId,
          teamId: session.teamId,
          seasonId: session.seasonId,
          values: validateTestValues(values, definition, complete),
          contextSnapshot: { preferredFoot: player.preferredFoot },
          createdBy: previous?.createdBy ?? context.userId,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        }
      })
    if (complete) {
      await repository.completeSession({ ...session, updatedAt: now }, results)
    } else if (results.length) {
      await repository.saveResults(results)
    }
    return results
  },
})

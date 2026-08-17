import { describe, expect, it, vi } from 'vitest'
import type {
  Player,
  TeamAccess,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import {
  buildPlayerHistory,
  createTestPlayerHistoryService,
  summarizeMetric,
} from './testPlayerHistoryService'

const now = new Date('2026-10-10T12:00:00Z')
const metric = {
  metricKey: 'HEIGHT',
  label: 'Hauteur',
  valueType: 'NUMBER' as const,
  unit: 'CENTIMETER' as const,
  direction: 'HIGHER_IS_BETTER' as const,
  required: true,
  order: 1,
}
const definition: TestDefinition = {
  testDefinitionId: 'test-jump-v1',
  name: 'Détente verticale',
  code: 'JUMP',
  domain: 'PHYSICAL',
  status: 'ACTIVE',
  version: 1,
  metrics: [metric],
  createdAt: now,
  updatedAt: now,
}
const player: Player = {
  playerId: 'alice',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2014-03-01T00:00:00Z'),
  playerProfile: 'MIDFIELDER',
  preferredFoot: 'RIGHT',
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
}
const session = (id: string, date: string, version = 1): TestSession => ({
  testSessionId: id,
  testDefinitionId:
    version === 1 ? definition.testDefinitionId : 'test-jump-v2',
  testDefinitionVersion: version,
  teamId: 'team-u13',
  seasonId: 'season-2026',
  categoryId: 'category-u13',
  date: new Date(date),
  status: 'COMPLETED',
  createdBy: 'coach',
  createdAt: now,
  updatedAt: now,
})
const result = (item: TestSession, value: number): TestResult => ({
  testResultId: `${item.testSessionId}_alice`,
  testSessionId: item.testSessionId,
  testDefinitionId: item.testDefinitionId,
  testDefinitionVersion: item.testDefinitionVersion,
  playerId: 'alice',
  teamId: item.teamId,
  seasonId: item.seasonId,
  values: { HEIGHT: value },
  contextSnapshot: { preferredFoot: 'RIGHT' },
  createdBy: 'coach',
  createdAt: now,
  updatedAt: now,
})
const accesses: TeamAccess[] = [
  {
    userTeamAccessId: 'access',
    userId: 'coach',
    teamId: 'team-u13',
    status: 'ACTIVE',
    rolePermissions: {
      coach: { permissions: ['tests.read'], medicalAccessLevel: 'NONE' },
    },
  },
]
const benchmark = {
  testBenchmarkId: 'b',
  testDefinitionId: definition.testDefinitionId,
  testDefinitionVersion: 1,
  metricKey: 'HEIGHT',
  subCategoryId: 'u13',
  seasonId: 'season-2026',
  benchmarkLevel: 'TARGET' as const,
  targetValue: 35,
  status: 'ACTIVE' as const,
  createdAt: now,
  updatedAt: now,
}
const context = {
  userId: 'coach',
  activeRoleId: 'coach',
  teamId: 'team-u13',
  seasonId: 'season-2026',
  accesses,
}

const repository = (
  sessions: TestSession[] = [],
  results: TestResult[] = [],
  definitions = [definition],
) => ({
  assignmentsForTeam: vi.fn().mockResolvedValue([
    {
      assignmentId: 'a',
      playerId: 'alice',
      teamId: 'team-u13',
      seasonId: 'season-2026',
      assignmentType: 'PRIMARY',
      startDate: new Date('2026-07-01'),
      status: 'ACTIVE',
    },
  ]),
  activePlayers: vi.fn().mockResolvedValue([player]),
  listResultsByPlayer: vi.fn().mockResolvedValue(results),
  listCompletedSessions: vi.fn().mockResolvedValue(sessions),
  listDefinitionsByIds: vi.fn().mockResolvedValue(definitions),
  getDefinitionById: vi.fn(),
  listCompletedSessionsByDefinition: vi.fn(),
  listResultsByDefinition: vi.fn(),
  getCategory: vi
    .fn()
    .mockResolvedValue({ categoryId: 'category-u13', subCategoryIds: ['u13'] }),
  getSubCategories: vi.fn().mockResolvedValue([
    {
      subCategoryId: 'u13',
      name: 'U13',
      seasonId: 'season-2026',
      birthYearRule: 2014,
      createdAt: now,
      updatedAt: now,
    },
  ]),
  getBenchmarks: vi.fn().mockResolvedValue([benchmark]),
})

describe('testPlayerHistoryService', () => {
  it('retourne un historique vide réel', () => {
    const data = buildPlayerHistory({
      player,
      results: [],
      sessions: [],
      definitions: [],
      benchmarks: [],
    })
    expect(data.histories).toEqual([])
  })

  it('calcule première, dernière, meilleure, moyenne, progression et benchmark', () => {
    const sessions = [
      session('s1', '2026-08-12'),
      session('s2', '2026-09-05'),
      session('s3', '2026-10-10'),
    ]
    const data = buildPlayerHistory({
      player,
      sessions,
      results: sessions.map((item, index) => result(item, [32, 35, 38][index])),
      definitions: [definition],
      benchmarks: [benchmark],
    })
    const summary = data.histories[0].metrics[0]
    expect({
      first: summary.first?.value,
      latest: summary.latest?.value,
      best: summary.best?.value,
      average: summary.average,
      count: summary.count,
    }).toEqual({ first: 32, latest: 38, best: 38, average: 35, count: 3 })
    expect(summary.evolution).toMatchObject({
      delta: 6,
      relativeChange: 18.75,
      performanceRelativeChange: 18.75,
      trend: 'IMPROVED',
    })
    expect(summary.benchmarks[0].comparison).toMatchObject({
      directionalDelta: 3,
      status: 'ABOVE_TARGET',
    })
  })

  it('respecte LOWER_IS_BETTER, la régression et l’égalité', () => {
    const lower = {
      ...metric,
      unit: 'SECOND' as const,
      direction: 'LOWER_IS_BETTER' as const,
    }
    const points = [10, 12].map((value, index) => ({
      session: session(`s${index}`, `2026-08-${index + 1}`),
      result: result(session(`s${index}`, `2026-08-${index + 1}`), value),
      metricKey: 'HEIGHT',
      unit: 'SECOND' as const,
      value,
    }))
    expect(summarizeMetric(lower, points).evolution?.trend).toBe('REGRESSED')
    expect(
      summarizeMetric(lower, [points[0], { ...points[1], value: 10 }]).evolution
        ?.trend,
    ).toBe('STABLE')
  })

  it('ne calcule pas une évolution avec une seule mesure', () => {
    const point = {
      session: session('single', '2026-08-01'),
      result: result(session('single', '2026-08-01'), 32),
      metricKey: 'HEIGHT',
      unit: 'CENTIMETER' as const,
      value: 32,
    }
    expect(summarizeMetric(metric, [point]).evolution).toBeUndefined()
  })

  it('conserve tous les niveaux de benchmark sans priorité implicite', () => {
    const points = [
      {
        session: session('single', '2026-08-01'),
        result: result(session('single', '2026-08-01'), 38),
        metricKey: 'HEIGHT',
        unit: 'CENTIMETER' as const,
        value: 38,
      },
    ]
    const good = {
      ...benchmark,
      testBenchmarkId: 'good',
      benchmarkLevel: 'GOOD' as const,
      targetValue: 37,
    }
    expect(
      summarizeMetric(metric, points, [benchmark, good]).benchmarks.map(
        ({ benchmark: item }) => item.benchmarkLevel,
      ),
    ).toEqual(['TARGET', 'GOOD'])
  })

  it('recalcule la comparaison avec un benchmark modifié', () => {
    const point = {
      session: session('single', '2026-08-01'),
      result: result(session('single', '2026-08-01'), 38),
      metricKey: 'HEIGHT',
      unit: 'CENTIMETER' as const,
      value: 38,
    }
    expect(
      summarizeMetric(metric, [point], [benchmark]).benchmarks[0].comparison
        ?.directionalDelta,
    ).toBe(3)
    expect(
      summarizeMetric(metric, [point], [{ ...benchmark, targetValue: 40 }])
        .benchmarks[0].comparison?.directionalDelta,
    ).toBe(-2)
  })

  it('sépare les versions et plusieurs protocoles', () => {
    const v2 = { ...definition, testDefinitionId: 'test-jump-v2', version: 2 }
    const sessions = [
      session('s1', '2026-08-12'),
      session('s2', '2026-10-10', 2),
    ]
    const data = buildPlayerHistory({
      player,
      sessions,
      results: [result(sessions[0], 32), result(sessions[1], 40)],
      definitions: [definition, v2],
      benchmarks: [benchmark],
    })
    expect(data.histories.map(({ definition: item }) => item.version)).toEqual([
      2, 1,
    ])
  })

  it('refuse une permission absente avant les lectures repository', async () => {
    const repo = repository()
    await expect(
      createTestPlayerHistoryService(repo).listScopedPlayers({
        ...context,
        accesses: [],
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(repo.assignmentsForTeam).not.toHaveBeenCalled()
  })

  it('propage une erreur repository', async () => {
    const repo = repository()
    repo.listCompletedSessions.mockRejectedValue(
      new Error('firestore unavailable'),
    )
    await expect(
      createTestPlayerHistoryService(repo).listCompletedSessions(context),
    ).rejects.toThrow('firestore unavailable')
  })
})

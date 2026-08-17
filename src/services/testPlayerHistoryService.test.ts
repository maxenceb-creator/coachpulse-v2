import { describe, expect, it, vi } from 'vitest'
import type {
  Player,
  TeamAccess,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import {
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
  getBenchmarks: vi.fn().mockResolvedValue([
    {
      testBenchmarkId: 'b',
      testDefinitionId: definition.testDefinitionId,
      testDefinitionVersion: 1,
      metricKey: 'HEIGHT',
      subCategoryId: 'u13',
      seasonId: 'season-2026',
      benchmarkLevel: 'TARGET',
      targetValue: 35,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ]),
})

describe('testPlayerHistoryService', () => {
  it('retourne un historique vide réel', async () => {
    const data = await createTestPlayerHistoryService(
      repository(),
    ).getPlayerHistory(context, 'alice')
    expect(data.histories).toEqual([])
  })

  it('calcule première, dernière, meilleure, moyenne, progression et benchmark', async () => {
    const sessions = [
      session('s1', '2026-08-12'),
      session('s2', '2026-09-05'),
      session('s3', '2026-10-10'),
    ]
    const data = await createTestPlayerHistoryService(
      repository(
        sessions,
        sessions.map((item, index) => result(item, [32, 35, 38][index])),
      ),
    ).getPlayerHistory(context, 'alice')
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
      trend: 'IMPROVED',
    })
    expect(summary.benchmarkComparison).toMatchObject({
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

  it('sépare les versions et plusieurs protocoles', async () => {
    const v2 = { ...definition, testDefinitionId: 'test-jump-v2', version: 2 }
    const sessions = [
      session('s1', '2026-08-12'),
      session('s2', '2026-10-10', 2),
    ]
    const data = await createTestPlayerHistoryService(
      repository(
        sessions,
        [result(sessions[0], 32), result(sessions[1], 40)],
        [definition, v2],
      ),
    ).getPlayerHistory(context, 'alice')
    expect(data.histories.map(({ definition: item }) => item.version)).toEqual([
      2, 1,
    ])
  })

  it('refuse playerId hors scope et permission absente', async () => {
    await expect(
      createTestPlayerHistoryService(repository()).getPlayerHistory(
        context,
        'intruder',
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    await expect(
      createTestPlayerHistoryService(repository()).getPlayerHistory(
        { ...context, accesses: [] },
        'alice',
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
  })

  it('propage une erreur repository', async () => {
    const repo = repository()
    repo.listResultsByPlayer.mockRejectedValue(
      new Error('firestore unavailable'),
    )
    await expect(
      createTestPlayerHistoryService(repo).getPlayerHistory(context, 'alice'),
    ).rejects.toThrow('firestore unavailable')
  })
})

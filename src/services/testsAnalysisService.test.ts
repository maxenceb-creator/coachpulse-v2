import { describe, expect, it, vi } from 'vitest'
import type {
  Player,
  TeamAccess,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import { createTestsAnalysisService } from './testsAnalysisService'

const date = new Date('2026-08-12T12:00:00.000Z')
const definition: TestDefinition = {
  testDefinitionId: 'test-juggling-v1',
  name: 'Jongles',
  code: 'JUGGLING',
  domain: 'TECHNICAL',
  status: 'ACTIVE',
  version: 1,
  metrics: [
    {
      metricKey: 'STRONG_FOOT',
      label: 'Pied fort',
      valueType: 'NUMBER',
      unit: 'COUNT',
      direction: 'HIGHER_IS_BETTER',
      required: true,
    },
  ],
  createdAt: date,
  updatedAt: date,
}
const session: TestSession = {
  testSessionId: 'session-juggling-u13',
  testDefinitionId: definition.testDefinitionId,
  testDefinitionVersion: 1,
  teamId: 'team-dev-u13f',
  seasonId: 'season-2026-2027',
  categoryId: 'category-u13f-2026',
  date,
  status: 'COMPLETED',
  createdBy: 'coach',
  createdAt: date,
  updatedAt: date,
}
const players: Player[] = ['alice', 'emma'].map((name, index) => ({
  playerId: `player-${name}`,
  firstName: name,
  lastName: 'Test',
  birthDate: new Date(`2014-0${index + 1}-01T00:00:00.000Z`),
  playerProfile: 'MIDFIELDER',
  preferredFoot: 'RIGHT',
  status: 'ACTIVE',
  createdAt: date,
  updatedAt: date,
}))
const results: TestResult[] = players.map((player, index) => ({
  testResultId: `${session.testSessionId}_${player.playerId}`,
  testSessionId: session.testSessionId,
  testDefinitionId: definition.testDefinitionId,
  testDefinitionVersion: 1,
  playerId: player.playerId,
  teamId: session.teamId,
  seasonId: session.seasonId,
  values: { STRONG_FOOT: index === 0 ? 52 : 0 },
  contextSnapshot: { preferredFoot: player.preferredFoot },
  createdBy: 'coach',
  createdAt: date,
  updatedAt: date,
}))
const accesses: TeamAccess[] = [
  {
    userTeamAccessId: 'coach_team-dev-u13f',
    userId: 'coach',
    teamId: session.teamId,
    status: 'ACTIVE',
    rolePermissions: {
      coach: { permissions: ['tests.read'], medicalAccessLevel: 'NONE' },
    },
  },
]

const repository = (sessionValues = [session], resultValues = results) => ({
  getDefinitionById: vi.fn().mockResolvedValue(definition),
  listCompletedSessionsByDefinition: vi.fn().mockResolvedValue(sessionValues),
  listResultsByDefinition: vi.fn().mockResolvedValue(resultValues),
  assignmentsForTeam: vi.fn().mockResolvedValue(
    players.map((player) => ({
      playerId: player.playerId,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
    })),
  ),
  activePlayers: vi
    .fn()
    .mockImplementation(async (ids: string[]) =>
      players.filter(({ playerId }) => ids.includes(playerId)),
    ),
  getCategory: vi.fn().mockResolvedValue({
    categoryId: session.categoryId,
    subCategoryIds: ['subcat-u13-2026'],
  }),
  getSubCategories: vi.fn().mockResolvedValue([
    {
      subCategoryId: 'subcat-u13-2026',
      birthYearRule: 2014,
    },
  ]),
  getBenchmarks: vi.fn().mockResolvedValue([
    {
      testBenchmarkId: 'benchmark-u13-juggling',
      testDefinitionId: definition.testDefinitionId,
      testDefinitionVersion: 1,
      metricKey: 'STRONG_FOOT',
      subCategoryId: 'subcat-u13-2026',
      seasonId: session.seasonId,
      benchmarkLevel: 'TARGET',
      targetValue: 50,
      status: 'ACTIVE',
      createdAt: date,
      updatedAt: date,
    },
  ]),
})
const context = {
  userId: 'coach',
  activeRoleId: 'coach',
  teamId: session.teamId,
  seasonId: session.seasonId,
  accesses,
}
const filters = {
  testDefinitionId: definition.testDefinitionId,
  testDefinitionVersion: 1,
  metricKey: 'STRONG_FOOT',
}

describe('testsAnalysisService — données DEV PR07', () => {
  it('analyse Jongles U13F, ses joueuses et son benchmark', async () => {
    const source = repository()
    const service = createTestsAnalysisService(source as never)
    const analysis = await service.getDefinitionAnalysis(context, filters)
    expect(analysis.sessions).toHaveLength(1)
    expect(analysis.histories).toHaveLength(2)
    expect(analysis.histories[0].benchmark?.targetValue).toBe(50)
    expect(analysis.histories[1].latest?.value).toBe(0)
    expect(source.listCompletedSessionsByDefinition).toHaveBeenCalledWith(
      session.teamId,
      session.seasonId,
      definition.testDefinitionId,
      1,
    )
  })

  it('retourne un état vide valide sans session', async () => {
    const analysis = await createTestsAnalysisService(
      repository([], []) as never,
    ).getDefinitionAnalysis(context, filters)
    expect(analysis.sessions).toEqual([])
    expect(analysis.histories).toEqual([])
  })

  it('retourne un état vide valide quand les résultats sont absents', async () => {
    const analysis = await createTestsAnalysisService(
      repository([session], []) as never,
    ).getDefinitionAnalysis(context, filters)
    expect(analysis.sessions).toHaveLength(1)
    expect(analysis.histories).toEqual([])
  })

  it('refuse un utilisateur sans tests.read', async () => {
    await expect(
      createTestsAnalysisService(repository() as never).getDefinitionAnalysis(
        { ...context, accesses: [] },
        filters,
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
  })

  it('refuse une autre Team sans TeamAccess correspondant', async () => {
    await expect(
      createTestsAnalysisService(repository() as never).getDefinitionAnalysis(
        { ...context, teamId: 'team-dev-u14f' },
        filters,
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
  })
})

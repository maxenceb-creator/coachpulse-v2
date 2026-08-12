import { describe, expect, it, vi } from 'vitest'
import type { TeamAccess, TestBenchmark, TestDefinition } from '../types/domain'
import {
  areTestMetricsComparable,
  createTestsService,
  isTargetReached,
  TestsDomainError,
  validateTestValues,
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
      coach: {
        permissions: ['tests.read', 'tests.write'],
        medicalAccessLevel: 'NONE',
      },
    },
  },
]

const repositoryMock = () => ({
  getActiveDefinitions: vi.fn().mockResolvedValue([definition]),
  getDefinitionById: vi.fn().mockResolvedValue(definition),
  getBenchmarks: vi.fn().mockResolvedValue([benchmark]),
  createSession: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
  getSessionById: vi.fn(),
  listSessions: vi.fn().mockResolvedValue([]),
  getResultsBySession: vi.fn().mockResolvedValue([]),
  saveResults: vi.fn().mockResolvedValue(undefined),
  completeSession: vi.fn().mockResolvedValue(undefined),
  assignmentsForTeam: vi.fn().mockResolvedValue([]),
  activePlayers: vi.fn().mockResolvedValue([]),
})

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
    const repository = repositoryMock()
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

  it('valide les métriques, la précision, les bornes et conserve zéro', () => {
    expect(validateTestValues({ TIME: 0 }, definition, true)).toEqual({
      TIME: 0,
    })
    expect(() =>
      validateTestValues({ UNKNOWN: 1 }, definition, false),
    ).toThrowError(expect.objectContaining({ code: 'METRIC_NOT_FOUND' }))
    expect(() =>
      validateTestValues({ TIME: -1 }, definition, false),
    ).toThrowError(
      expect.objectContaining({ code: 'METRIC_VALUE_OUT_OF_RANGE' }),
    )
    expect(() =>
      validateTestValues({ TIME: 3.456 }, definition, false),
    ).toThrowError(
      expect.objectContaining({ code: 'METRIC_PRECISION_INVALID' }),
    )
    expect(() =>
      validateTestValues({ TIME: undefined }, definition, true),
    ).toThrowError(expect.objectContaining({ code: 'REQUIRED_METRIC_MISSING' }))
  })

  it('calcule les joueuses éligibles à la date sportive de la session', async () => {
    const repository = repositoryMock()
    repository.assignmentsForTeam.mockResolvedValue([
      {
        assignmentId: 'before',
        playerId: 'player-before',
        teamId: 'team',
        seasonId: 'season-2026',
        assignmentType: 'TEMPORARY',
        startDate: new Date('2026-09-01'),
        status: 'ACTIVE',
      },
      {
        assignmentId: 'current',
        playerId: 'player-current',
        teamId: 'team',
        seasonId: 'season-2026',
        assignmentType: 'PRIMARY',
        startDate: new Date('2026-08-01'),
        status: 'ACTIVE',
      },
    ])
    repository.activePlayers.mockImplementation(async (ids: string[]) =>
      ids.map((playerId) => ({ playerId })),
    )
    const service = createTestsService(repository)
    await service.getEligiblePlayers(
      { userId: 'user', activeRoleId: 'coach', teamId: 'team', accesses },
      {
        testSessionId: 'session',
        testDefinitionId: definition.testDefinitionId,
        testDefinitionVersion: 1,
        teamId: 'team',
        seasonId: 'season-2026',
        categoryId: 'category',
        date: new Date('2026-08-12'),
        status: 'DRAFT',
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
      },
    )
    expect(repository.activePlayers).toHaveBeenCalledWith(['player-current'])
  })

  it('refuse une création de session hors Team ou avec une mauvaise version', async () => {
    const service = createTestsService(repositoryMock())
    const context = {
      userId: 'user',
      activeRoleId: 'coach',
      teamId: 'team',
      accesses,
    }
    const input = {
      testSessionId: 'session',
      testDefinitionId: definition.testDefinitionId,
      testDefinitionVersion: 1,
      teamId: 'team',
      seasonId: 'season-2026',
      categoryId: 'category',
      date: now,
    }
    await expect(
      service.createSession(context, { ...input, teamId: 'other' }),
    ).rejects.toMatchObject({ code: 'TEST_CONTEXT_MISMATCH' })
    await expect(
      service.createSession(context, { ...input, testDefinitionVersion: 2 }),
    ).rejects.toMatchObject({ code: 'TEST_DEFINITION_VERSION_MISMATCH' })
  })

  it('sauvegarde zéro sous un ID déterministe et refuse une joueuse hors scope', async () => {
    const repository = repositoryMock()
    const service = createTestsService(repository)
    const session = {
      testSessionId: 'session',
      testDefinitionId: definition.testDefinitionId,
      testDefinitionVersion: 1,
      teamId: 'team',
      seasonId: 'season-2026',
      categoryId: 'category',
      date: now,
      status: 'DRAFT' as const,
      createdBy: 'user',
      createdAt: now,
      updatedAt: now,
    }
    const player = {
      playerId: 'player',
      firstName: 'Ada',
      lastName: 'Test',
      birthDate: now,
      playerProfile: 'FORWARD' as const,
      preferredFoot: 'RIGHT' as const,
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    }
    const context = {
      userId: 'user',
      activeRoleId: 'coach',
      teamId: 'team',
      accesses,
    }
    await service.saveResults(
      context,
      session,
      definition,
      [player],
      [{ playerId: 'player', values: { TIME: 0 } }],
    )
    expect(repository.saveResults).toHaveBeenCalledWith([
      expect.objectContaining({
        testResultId: 'session_player',
        values: { TIME: 0 },
        playerId: 'player',
      }),
    ])
    await expect(
      service.saveResults(
        context,
        session,
        definition,
        [player],
        [{ playerId: 'other', values: { TIME: 3.2 } }],
      ),
    ).rejects.toMatchObject({ code: 'PLAYER_NOT_ELIGIBLE' })
  })
})

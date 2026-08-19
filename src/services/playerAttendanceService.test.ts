import { describe, expect, it, vi } from 'vitest'
import type { Attendance, Player, Session, TeamAccess } from '../types/domain'
import { attendanceRepository } from '../repositories/attendanceRepository'
import {
  buildPlayerAttendanceSummary,
  createPlayerAttendanceService,
  PlayerAttendanceError,
} from './playerAttendanceService'

const date = new Date('2026-08-12T18:00:00.000Z')
const session = (sessionId: string, month = 7): Session => ({
  sessionId,
  seasonId: 'season-a',
  categoryId: 'category-a',
  sessionType: 'TRAINING',
  startDateTime: new Date(Date.UTC(2026, month, 12, 18)),
  plannedDurationMinutes: 90,
  status: 'COMPLETED',
  createdByUserId: 'user-a',
  createdAt: date,
  updatedAt: date,
})
const attendance = (
  sessionId: string,
  status: Attendance['status'],
): Attendance => ({
  attendanceId: `${sessionId}_player-a`,
  sessionId,
  playerId: 'player-a',
  status,
  recordedByUserId: 'user-a',
  createdAt: date,
  updatedAt: date,
})

describe('buildPlayerAttendanceSummary', () => {
  it('retourne un état vide sans inventer un taux', () => {
    expect(buildPlayerAttendanceSummary([], [])).toMatchObject({
      sessionsConcerned: 0,
      present: 0,
      absent: 0,
      attendanceRate: null,
    })
  })

  it('calcule 100 % pour des présences physiques et compte les retards', () => {
    const summary = buildPlayerAttendanceSummary(
      [session('s1'), session('s2')],
      [attendance('s1', 'PRESENT'), attendance('s2', 'LATE')],
    )
    expect(summary).toMatchObject({
      sessionsConcerned: 2,
      present: 2,
      absent: 0,
      late: 1,
      attendanceRate: 100,
    })
  })

  it('distingue les absences justifiées, non justifiées et les statuts spécifiques', () => {
    const statuses: Attendance['status'][] = [
      'ABSENT_JUSTIFIED',
      'ABSENT_UNJUSTIFIED',
      'INJURED',
      'SICK',
      'EXTERNAL_PROGRAM',
      'EXCUSED',
    ]
    const sessions = statuses.map((_, index) => session(`s${index}`, index))
    const summary = buildPlayerAttendanceSummary(
      sessions,
      statuses.map((status, index) => attendance(`s${index}`, status)),
    )
    expect(summary).toMatchObject({
      absent: 6,
      justifiedAbsences: 5,
      unjustifiedAbsences: 1,
      attendanceRate: 0,
    })
    expect(summary.recentEvents[0].session.startDateTime.getUTCMonth()).toBe(5)
  })

  it('conserve une séance non renseignée dans le dénominateur', () => {
    expect(
      buildPlayerAttendanceSummary(
        [session('s1'), session('s2')],
        [attendance('s1', 'PRESENT')],
      ),
    ).toMatchObject({ missing: 1, attendanceRate: 50 })
  })
})

const access: TeamAccess = {
  userTeamAccessId: 'user-a_team-a',
  userId: 'user-a',
  teamId: 'team-a',
  status: 'ACTIVE',
  rolePermissions: {
    coach: { permissions: ['attendance.read'], medicalAccessLevel: 'NONE' },
  },
}
const player = { playerId: 'player-a' } as Player
const context = {
  userId: 'user-a',
  activeRoleId: 'coach',
  teamId: 'team-a',
  seasonId: 'season-a',
  categoryId: 'category-a',
  accesses: [access],
}

const repository = () =>
  ({
    completedSessions: vi.fn(async () => [session('s1')]),
    participantsByIds: vi.fn(async () => [
      {
        sessionParticipantId: 's1_player-a',
        sessionId: 's1',
        playerId: 'player-a',
        participationType: 'EXPECTED' as const,
        createdAt: date,
        updatedAt: date,
      },
    ]),
    attendanceByIds: vi.fn(async () => [attendance('s1', 'PRESENT')]),
  }) satisfies typeof attendanceRepository

describe('playerAttendanceService', () => {
  it('charge le contexte Team/saison, puis les documents déterministes par lots', async () => {
    const repo = repository()
    const result = await createPlayerAttendanceService(repo).getPlayerSummary(
      context,
      'player-a',
      [player],
    )
    expect(repo.completedSessions).toHaveBeenCalledWith(
      'season-a',
      'category-a',
      expect.any(Date),
    )
    expect(repo.participantsByIds).toHaveBeenCalledWith(['s1_player-a'])
    expect(repo.attendanceByIds).toHaveBeenCalledWith(['s1_player-a'])
    expect(result.attendanceRate).toBe(100)
  })

  it('refuse une permission absente avant le repository', async () => {
    const repo = repository()
    await expect(
      createPlayerAttendanceService(repo).getPlayerSummary(
        { ...context, accesses: [] },
        'player-a',
        [player],
      ),
    ).rejects.toEqual(new PlayerAttendanceError('PERMISSION_DENIED'))
    expect(repo.completedSessions).not.toHaveBeenCalled()
  })

  it('refuse une joueuse hors scope', async () => {
    await expect(
      createPlayerAttendanceService(repository()).getPlayerSummary(
        context,
        'player-b',
        [player],
      ),
    ).rejects.toEqual(new PlayerAttendanceError('PLAYER_OUT_OF_SCOPE'))
  })

  it('propage une erreur repository pour que la section la contienne localement', async () => {
    const repo = repository()
    repo.completedSessions.mockRejectedValue(new Error('network'))
    await expect(
      createPlayerAttendanceService(repo).getPlayerSummary(
        context,
        'player-a',
        [player],
      ),
    ).rejects.toThrow('network')
  })
})

import { attendanceRepository } from '../repositories/attendanceRepository'
import type {
  Attendance,
  AttendanceStatus,
  Player,
  Session,
  TeamAccess,
} from '../types/domain'
import { hasPermission } from './permissionsService'

export type PlayerAttendanceContext = {
  userId: string
  activeRoleId: string
  teamId: string
  seasonId: string
  categoryId?: string
  accesses: TeamAccess[]
}

export class PlayerAttendanceError extends Error {
  constructor(
    public readonly code:
      'PERMISSION_DENIED' | 'PLAYER_OUT_OF_SCOPE' | 'CATEGORY_REQUIRED',
  ) {
    super(code)
  }
}

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Présente',
  LATE: 'Retard',
  ABSENT_JUSTIFIED: 'Absence justifiée',
  ABSENT_UNJUSTIFIED: 'Absence non justifiée',
  INJURED: 'Blessée',
  SICK: 'Malade',
  EXTERNAL_PROGRAM: 'Programme extérieur',
  EXCUSED: 'Dispensée',
}

const physicalPresenceStatuses = new Set<AttendanceStatus>(['PRESENT', 'LATE'])
const absenceStatuses = new Set<AttendanceStatus>([
  'ABSENT_JUSTIFIED',
  'ABSENT_UNJUSTIFIED',
  'INJURED',
  'SICK',
  'EXTERNAL_PROGRAM',
  'EXCUSED',
])

export type PlayerAttendanceEvent = {
  session: Session
  attendance: Attendance
}

export const buildPlayerAttendanceSummary = (
  sessions: Session[],
  attendance: Attendance[],
) => {
  const attendanceBySession = new Map(
    attendance.map((item) => [item.sessionId, item]),
  )
  const events = sessions
    .flatMap((session) => {
      const item = attendanceBySession.get(session.sessionId)
      return item ? [{ session, attendance: item }] : []
    })
    .sort(
      (a, b) =>
        b.session.startDateTime.getTime() - a.session.startDateTime.getTime(),
    )
  const count = (statuses: Set<AttendanceStatus>) =>
    events.filter(({ attendance: item }) => statuses.has(item.status)).length
  const present = count(physicalPresenceStatuses)
  const sessionsConcerned = sessions.length

  return {
    sessionsConcerned,
    present,
    absent: count(absenceStatuses),
    late: events.filter(({ attendance: item }) => item.status === 'LATE')
      .length,
    justifiedAbsences: events.filter(({ attendance: item }) =>
      [
        'ABSENT_JUSTIFIED',
        'INJURED',
        'SICK',
        'EXTERNAL_PROGRAM',
        'EXCUSED',
      ].includes(item.status),
    ).length,
    unjustifiedAbsences: events.filter(
      ({ attendance: item }) => item.status === 'ABSENT_UNJUSTIFIED',
    ).length,
    missing: sessionsConcerned - events.length,
    attendanceRate:
      sessionsConcerned === 0 ? null : (present / sessionsConcerned) * 100,
    recentEvents: events.slice(0, 5),
  }
}

type AttendanceRepository = typeof attendanceRepository

export const createPlayerAttendanceService = (
  repository: AttendanceRepository = attendanceRepository,
) => ({
  async getPlayerSummary(
    context: PlayerAttendanceContext,
    playerId: string,
    scopedPlayers: Player[],
  ) {
    if (
      !hasPermission(context.accesses, {
        userId: context.userId,
        activeRoleId: context.activeRoleId,
        teamId: context.teamId,
        permissionKey: 'attendance.read',
      })
    )
      throw new PlayerAttendanceError('PERMISSION_DENIED')
    if (!scopedPlayers.some((player) => player.playerId === playerId))
      throw new PlayerAttendanceError('PLAYER_OUT_OF_SCOPE')
    if (!context.categoryId)
      throw new PlayerAttendanceError('CATEGORY_REQUIRED')

    const sessions = await repository.completedSessions(
      context.seasonId,
      context.categoryId,
      new Date(),
    )
    const participantIds = sessions.map(
      ({ sessionId }) => `${sessionId}_${playerId}`,
    )
    const participants = await repository.participantsByIds(participantIds)
    const expectedSessionIds = new Set(
      participants
        .filter((participant) => participant.playerId === playerId)
        .map(({ sessionId }) => sessionId),
    )
    const concernedSessions = sessions.filter(({ sessionId }) =>
      expectedSessionIds.has(sessionId),
    )
    const attendance = await repository.attendanceByIds(
      concernedSessions.map(({ sessionId }) => `${sessionId}_${playerId}`),
    )
    return buildPlayerAttendanceSummary(concernedSessions, attendance)
  },
})

export const playerAttendanceService = createPlayerAttendanceService()

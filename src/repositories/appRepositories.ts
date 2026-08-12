import { where } from 'firebase/firestore'
import { many, one, documentId, update } from './firestoreRepository'
import {
  accessSchema,
  assignmentSchema,
  playerSchema,
  roleSchema,
  seasonSchema,
  teamSchema,
  userSchema,
} from '../validation/schemas'
export const repositories = {
  user: (id: string) => one('users', id, userSchema),
  setSecurityContext: (
    userId: string,
    activeRoleId: string,
    activeTeamId: string,
    activeSeasonId: string,
  ) =>
    update('users', userId, {
      securityContext: { activeRoleId, activeTeamId, activeSeasonId },
    }),
  roles: (ids: string[]) =>
    ids.length
      ? many('roles', roleSchema, [where(documentId(), 'in', ids.slice(0, 30))])
      : Promise.resolve([]),
  access: (uid: string) =>
    many('userTeamAccess', accessSchema, [
      where('userId', '==', uid),
      where('status', '==', 'ACTIVE'),
    ]),
  teams: (ids: string[]) =>
    ids.length
      ? many('teams', teamSchema, [
          where(documentId(), 'in', ids.slice(0, 30)),
          where('status', '==', 'ACTIVE'),
        ])
      : Promise.resolve([]),
  activeSeason: () =>
    many('seasons', seasonSchema, [
      where('isActive', '==', true),
      where('status', '==', 'ACTIVE'),
    ]),
  assignmentsForTeam: (teamId: string, seasonId: string) =>
    many('playerTeamAssignments', assignmentSchema, [
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      where('status', '==', 'ACTIVE'),
    ]),
  async activePlayerCount(playerIds: string[]) {
    if (!playerIds.length) return 0
    const groups = Array.from(
      { length: Math.ceil(playerIds.length / 30) },
      (_, i) => playerIds.slice(i * 30, i * 30 + 30),
    )
    return (
      await Promise.all(
        groups.map((g) =>
          many('players', playerSchema, [
            where(documentId(), 'in', g),
            where('status', '==', 'ACTIVE'),
          ]),
        ),
      )
    ).flat().length
  },
  async activePlayers(playerIds: string[]) {
    if (!playerIds.length) return []
    const groups = Array.from(
      { length: Math.ceil(playerIds.length / 30) },
      (_, i) => playerIds.slice(i * 30, i * 30 + 30),
    )
    return (
      await Promise.all(
        groups.map((group) =>
          many('players', playerSchema, [
            where(documentId(), 'in', group),
            where('status', '==', 'ACTIVE'),
          ]),
        ),
      )
    ).flat()
  },
}

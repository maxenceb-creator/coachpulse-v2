import { documentId, orderBy, where } from 'firebase/firestore'
import {
  attendanceSchema,
  sessionParticipantSchema,
  sessionSchema,
} from '../validation/schemas'
import { many } from './firestoreRepository'

const chunks = <T>(values: T[], size = 30) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, index * size + size),
  )

export const attendanceRepository = {
  completedSessions: (seasonId: string, categoryId: string, through: Date) =>
    many('sessions', sessionSchema, [
      where('seasonId', '==', seasonId),
      where('categoryId', '==', categoryId),
      where('status', '==', 'COMPLETED'),
      where('startDateTime', '<=', through),
      orderBy('startDateTime', 'desc'),
    ]),

  async participantsByIds(participantIds: string[]) {
    return (
      await Promise.all(
        chunks([...new Set(participantIds)]).map((ids) =>
          many('sessionParticipants', sessionParticipantSchema, [
            where(documentId(), 'in', ids),
          ]),
        ),
      )
    ).flat()
  },

  async attendanceByIds(attendanceIds: string[]) {
    return (
      await Promise.all(
        chunks([...new Set(attendanceIds)]).map((ids) =>
          many('attendance', attendanceSchema, [
            where(documentId(), 'in', ids),
          ]),
        ),
      )
    ).flat()
  },
}

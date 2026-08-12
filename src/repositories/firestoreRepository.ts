import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  type QueryConstraint,
} from 'firebase/firestore'
import type { ZodType } from 'zod'
import { db } from '../config/firebase'

type FirestoreFailure = Error & { code?: string }

const withDevFirestoreLog = async <T>(
  operation: string,
  run: () => Promise<T>,
) => {
  try {
    return await run()
  } catch (error) {
    if (import.meta.env.DEV) {
      const failure = error as FirestoreFailure
      console.error('[Firestore DEV] Requête échouée', {
        operation,
        code: failure.code ?? 'UNKNOWN',
        message: failure.message,
        error,
      })
    }
    throw error
  }
}
const ids: Record<string, string> = {
  users: 'userId',
  roles: 'roleId',
  userTeamAccess: 'userTeamAccessId',
  teams: 'teamId',
  seasons: 'seasonId',
  players: 'playerId',
  playerTeamAssignments: 'assignmentId',
}
export async function one<T>(path: string, id: string, s: ZodType<T>) {
  return withDevFirestoreLog(`getDoc ${path}/${id}`, async () => {
    const x = await getDoc(doc(db, path, id))
    return x.exists() ? s.parse({ ...x.data(), [ids[path]]: x.id }) : null
  })
}
export async function many<T>(
  path: string,
  s: ZodType<T>,
  constraints: QueryConstraint[],
) {
  return withDevFirestoreLog(`getDocs ${path}`, async () => {
    const x = await getDocs(query(collection(db, path), ...constraints))
    return x.docs.map((d) =>
      s.parse({ ...d.data(), [ids[path] ?? 'id']: d.id }),
    )
  })
}
export { documentId }

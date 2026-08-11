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
  const x = await getDoc(doc(db, path, id))
  return x.exists() ? s.parse({ ...x.data(), [ids[path]]: x.id }) : null
}
export async function many<T>(
  path: string,
  s: ZodType<T>,
  constraints: QueryConstraint[],
) {
  const x = await getDocs(query(collection(db, path), ...constraints))
  return x.docs.map((d) => s.parse({ ...d.data(), [ids[path] ?? 'id']: d.id }))
}
export { documentId }

import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
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
  categories: 'categoryId',
  subCategories: 'subCategoryId',
  players: 'playerId',
  playerTeamAssignments: 'assignmentId',
  testDefinitions: 'testDefinitionId',
  testBenchmarks: 'testBenchmarkId',
  testSessions: 'testSessionId',
  testResults: 'testResultId',
}
export const withFirestoreDocumentId = (
  path: string,
  id: string,
  data: Record<string, unknown>,
) => ({ ...data, [ids[path] ?? 'id']: id })
export async function one<T>(path: string, id: string, s: ZodType<T>) {
  return withDevFirestoreLog(`getDoc ${path}/${id}`, async () => {
    const x = await getDoc(doc(db, path, id))
    return x.exists()
      ? s.parse(withFirestoreDocumentId(path, x.id, x.data()))
      : null
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
      s.parse(withFirestoreDocumentId(path, d.id, d.data())),
    )
  })
}
export { documentId }

export async function update(path: string, id: string, data: object) {
  return withDevFirestoreLog(`updateDoc ${path}/${id}`, () =>
    updateDoc(doc(db, path, id), data),
  )
}

export async function set(path: string, id: string, data: object) {
  return withDevFirestoreLog(`setDoc ${path}/${id}`, () =>
    setDoc(doc(db, path, id), data),
  )
}

export async function setMany(
  writes: { path: string; id: string; data: object }[],
) {
  return withDevFirestoreLog('writeBatch', async () => {
    const batch = writeBatch(db)
    writes.forEach((write) =>
      batch.set(doc(db, write.path, write.id), write.data),
    )
    await batch.commit()
  })
}

export async function commitWrites(
  sets: { path: string; id: string; data: object }[],
  updates: { path: string; id: string; data: object }[] = [],
) {
  return withDevFirestoreLog('writeBatch', async () => {
    const batch = writeBatch(db)
    sets.forEach((write) =>
      batch.set(doc(db, write.path, write.id), write.data),
    )
    updates.forEach((write) =>
      batch.update(doc(db, write.path, write.id), write.data),
    )
    await batch.commit()
  })
}

export async function deleteMany(deletes: { path: string; id: string }[]) {
  return withDevFirestoreLog('deleteBatch', async () => {
    const batch = writeBatch(db)
    deletes.forEach((item) => batch.delete(doc(db, item.path, item.id)))
    await batch.commit()
  })
}

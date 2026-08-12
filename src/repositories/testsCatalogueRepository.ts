import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type {
  Category,
  SubCategory,
  TestBenchmark,
  TestDefinition,
} from '../types/domain'
import {
  subCategorySchema,
  testBenchmarkSchema,
  testDefinitionSchema,
  categorySchema,
} from '../validation/schemas'
import { many, one, update } from './firestoreRepository'
import { withFirestoreDocumentId } from './firestoreDocumentIds'

export type DefinitionWrite = Omit<
  TestDefinition,
  'createdAt' | 'updatedAt'
> & { createdAt?: Date; updatedAt?: Date }

export interface TestsCatalogueRepository {
  listDefinitions(): Promise<TestDefinition[]>
  getDefinition(id: string): Promise<TestDefinition | null>
  createDefinition(value: DefinitionWrite): Promise<void>
  updateDefinition(id: string, value: Partial<TestDefinition>): Promise<void>
  deleteDefinition(id: string): Promise<void>
  isDefinitionUsed(id: string, version: number): Promise<boolean>
  listVersions(code: string): Promise<TestDefinition[]>
  createNextVersion(value: DefinitionWrite): Promise<void>
  listBenchmarks(
    definitionId: string,
    version: number,
    seasonId: string,
  ): Promise<TestBenchmark[]>
  createBenchmark(value: TestBenchmark): Promise<void>
  getBenchmark(id: string): Promise<TestBenchmark | null>
  updateBenchmark(id: string, value: Partial<TestBenchmark>): Promise<void>
  listSubCategories(seasonId: string, ids: string[]): Promise<SubCategory[]>
  getCategory(id: string): Promise<Category | null>
}

const createIfAbsent = async (
  path: 'testDefinitions' | 'testBenchmarks',
  id: string,
  data: object,
) =>
  runTransaction(db, async (transaction) => {
    const reference = doc(db, path, id)
    if ((await transaction.get(reference)).exists()) {
      throw new Error('DOCUMENT_ALREADY_EXISTS')
    }
    transaction.set(reference, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

const defined = (value: object) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  )

export const testsCatalogueRepository: TestsCatalogueRepository = {
  listDefinitions: () =>
    many('testDefinitions', testDefinitionSchema, [limit(100)]),
  getDefinition: (id) => one('testDefinitions', id, testDefinitionSchema),
  createDefinition: (value) => {
    const { testDefinitionId, ...data } = value
    return createIfAbsent('testDefinitions', testDefinitionId, defined(data))
  },
  updateDefinition: (id, value) =>
    update('testDefinitions', id, {
      ...defined(value),
      updatedAt: serverTimestamp(),
    }),
  deleteDefinition: (id) => deleteDoc(doc(db, 'testDefinitions', id)),
  isDefinitionUsed: async (id, version) => {
    const snapshot = await getDocs(
      query(
        collection(db, 'testSessions'),
        where('testDefinitionId', '==', id),
        where('testDefinitionVersion', '==', version),
        limit(1),
      ),
    )
    return !snapshot.empty
  },
  listVersions: () =>
    many('testDefinitions', testDefinitionSchema, [limit(100)]),
  createNextVersion: (value) => {
    const { testDefinitionId, ...data } = value
    return createIfAbsent('testDefinitions', testDefinitionId, defined(data))
  },
  listBenchmarks: (definitionId, version, seasonId) =>
    many('testBenchmarks', testBenchmarkSchema, [
      where('testDefinitionId', '==', definitionId),
      where('testDefinitionVersion', '==', version),
      where('seasonId', '==', seasonId),
      limit(100),
    ]),
  createBenchmark: (value) => {
    const { testBenchmarkId, ...data } = value
    return createIfAbsent('testBenchmarks', testBenchmarkId, defined(data))
  },
  getBenchmark: (id) => one('testBenchmarks', id, testBenchmarkSchema),
  updateBenchmark: (id, value) =>
    update('testBenchmarks', id, {
      ...defined(value),
      updatedAt: serverTimestamp(),
    }),
  listSubCategories: async (seasonId, ids) => {
    if (!ids.length) return []
    const snapshot = await getDocs(
      query(
        collection(db, 'subCategories'),
        where('seasonId', '==', seasonId),
        limit(100),
      ),
    )
    return snapshot.docs
      .filter((item) => ids.includes(item.id))
      .map((item) =>
        subCategorySchema.parse(
          withFirestoreDocumentId('subCategories', item.id, item.data()),
        ),
      )
  },
  getCategory: (id) => one('categories', id, categorySchema),
}

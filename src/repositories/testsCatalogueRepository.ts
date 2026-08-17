import {
  deleteDoc,
  doc,
  limit,
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
import { many, one, set as setDocument, update } from './firestoreRepository'

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
  listVersions(code: string): Promise<TestDefinition[]>
  createNextVersion(value: DefinitionWrite): Promise<void>
  listBenchmarks(
    definitionId: string,
    version: number,
    seasonId: string,
    subCategoryIds: string[],
  ): Promise<TestBenchmark[]>
  createBenchmark(value: TestBenchmark): Promise<void>
  getBenchmark(id: string): Promise<TestBenchmark | null>
  updateBenchmark(id: string, value: Partial<TestBenchmark>): Promise<void>
  deleteBenchmark(id: string): Promise<void>
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

const withoutNestedUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNestedUndefined)
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutNestedUndefined(item)]),
    )
  return value
}

export const definitionUpdatePayload = (
  value: Partial<TestDefinition>,
): Partial<TestDefinition> =>
  withoutNestedUndefined({
    ...(value.name !== undefined ? { name: value.name } : {}),
    ...(value.description !== undefined
      ? { description: value.description }
      : {}),
    ...(value.domain !== undefined ? { domain: value.domain } : {}),
    ...(value.status !== undefined ? { status: value.status } : {}),
    ...(value.metrics !== undefined ? { metrics: value.metrics } : {}),
  }) as Partial<TestDefinition>

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
      ...definitionUpdatePayload(value),
      updatedAt: serverTimestamp(),
    }),
  deleteDefinition: (id) => deleteDoc(doc(db, 'testDefinitions', id)),
  listVersions: () =>
    many('testDefinitions', testDefinitionSchema, [limit(100)]),
  createNextVersion: (value) => {
    const { testDefinitionId, ...data } = value
    return createIfAbsent('testDefinitions', testDefinitionId, defined(data))
  },
  listBenchmarks: async (definitionId, version, seasonId, subCategoryIds) =>
    (
      await Promise.all(
        subCategoryIds.map((subCategoryId) =>
          many('testBenchmarks', testBenchmarkSchema, [
            where('testDefinitionId', '==', definitionId),
            where('testDefinitionVersion', '==', version),
            where('seasonId', '==', seasonId),
            where('subCategoryId', '==', subCategoryId),
            limit(100),
          ]),
        ),
      )
    ).flat(),
  createBenchmark: (value) => {
    const { testBenchmarkId, ...data } = value
    return setDocument('testBenchmarks', testBenchmarkId, {
      ...defined(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(async (error: unknown) => {
      try {
        if (await one('testBenchmarks', testBenchmarkId, testBenchmarkSchema))
          throw new Error('DOCUMENT_ALREADY_EXISTS')
      } catch (inspectionError) {
        if (
          inspectionError instanceof Error &&
          inspectionError.message === 'DOCUMENT_ALREADY_EXISTS'
        )
          throw inspectionError
      }
      throw error
    })
  },
  getBenchmark: (id) => one('testBenchmarks', id, testBenchmarkSchema),
  updateBenchmark: (id, value) =>
    update('testBenchmarks', id, {
      ...defined(value),
      updatedAt: serverTimestamp(),
    }),
  deleteBenchmark: (id) => deleteDoc(doc(db, 'testBenchmarks', id)),
  listSubCategories: async (seasonId, ids) => {
    if (!ids.length) return []
    const subCategories = await Promise.all(
      ids.map((id) => one('subCategories', id, subCategorySchema)),
    )
    return subCategories.filter(
      (item): item is SubCategory =>
        item !== null && item.seasonId === seasonId,
    )
  },
  getCategory: (id) => one('categories', id, categorySchema),
}

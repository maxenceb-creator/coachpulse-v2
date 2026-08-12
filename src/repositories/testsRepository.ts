import { limit, where } from 'firebase/firestore'
import type { TestBenchmark, TestDefinition } from '../types/domain'
import {
  testBenchmarkSchema,
  testDefinitionSchema,
} from '../validation/schemas'
import { many, one } from './firestoreRepository'

export type TestBenchmarksQuery = {
  subCategoryId: string
  seasonId: string
  testDefinitionId?: string
}

export interface TestsRepository {
  getActiveDefinitions(): Promise<TestDefinition[]>
  getDefinitionById(testDefinitionId: string): Promise<TestDefinition | null>
  getBenchmarks(query: TestBenchmarksQuery): Promise<TestBenchmark[]>
}

export const testsRepository: TestsRepository = {
  getActiveDefinitions: () =>
    many('testDefinitions', testDefinitionSchema, [
      where('status', '==', 'ACTIVE'),
      limit(50),
    ]),
  getDefinitionById: (testDefinitionId) =>
    one('testDefinitions', testDefinitionId, testDefinitionSchema),
  getBenchmarks: ({ subCategoryId, seasonId, testDefinitionId }) =>
    many('testBenchmarks', testBenchmarkSchema, [
      where('status', '==', 'ACTIVE'),
      where('subCategoryId', '==', subCategoryId),
      where('seasonId', '==', seasonId),
      ...(testDefinitionId
        ? [where('testDefinitionId', '==', testDefinitionId)]
        : []),
      limit(100),
    ]),
}

import {
  documentId,
  limit,
  orderBy,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import type {
  Category,
  SubCategory,
  TestBenchmark,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import {
  categorySchema,
  subCategorySchema,
  testBenchmarkSchema,
  testDefinitionSchema,
  testResultSchema,
  testSessionSchema,
} from '../validation/schemas'
import {
  commitWrites,
  deleteMany,
  many,
  one,
  set,
  setMany,
  update,
} from './firestoreRepository'
import {
  toTestResultDocument,
  toTestSessionDocument,
} from './testDocumentMappers'

export type TestBenchmarksQuery = {
  subCategoryId: string
  seasonId: string
  testDefinitionId?: string
}

export interface TestsRepository {
  getActiveDefinitions(): Promise<TestDefinition[]>
  getDefinitionById(testDefinitionId: string): Promise<TestDefinition | null>
  getBenchmarks(query: TestBenchmarksQuery): Promise<TestBenchmark[]>
  createSession(session: TestSession): Promise<void>
  updateSession(id: string, data: Partial<TestSession>): Promise<void>
  getSessionById(id: string): Promise<TestSession | null>
  listSessions(teamId: string, seasonId: string): Promise<TestSession[]>
  getResultsBySession(
    testSessionId: string,
    teamId: string,
    seasonId: string,
  ): Promise<TestResult[]>
  getResultsForDeletion(
    testSessionId: string,
    teamId: string,
    seasonId: string,
  ): Promise<TestResult[]>
  saveResults(results: TestResult[]): Promise<void>
  completeSession(session: TestSession, results: TestResult[]): Promise<void>
  deleteSessionWithResults(
    session: TestSession,
    results: TestResult[],
  ): Promise<void>
}

export interface TestsAnalyticsRepository {
  getDefinitionById(testDefinitionId: string): Promise<TestDefinition | null>
  getBenchmarks(query: TestBenchmarksQuery): Promise<TestBenchmark[]>
  listCompletedSessionsByDefinition(
    teamId: string,
    seasonId: string,
    testDefinitionId: string,
    testDefinitionVersion: number,
  ): Promise<TestSession[]>
  listResultsByDefinition(
    teamId: string,
    seasonId: string,
    testDefinitionId: string,
    testDefinitionVersion: number,
  ): Promise<TestResult[]>
  getCategory(categoryId: string): Promise<Category | null>
  getSubCategories(ids: string[]): Promise<SubCategory[]>
}

export const testsRepository: TestsRepository & TestsAnalyticsRepository = {
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
  createSession: (value) => {
    const { testSessionId } = value
    const session = toTestSessionDocument(value)
    return set('testSessions', testSessionId, {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },
  updateSession: (id, data) => update('testSessions', id, data),
  getSessionById: (id) => one('testSessions', id, testSessionSchema),
  listSessions: (teamId, seasonId) =>
    many('testSessions', testSessionSchema, [
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      orderBy('date', 'desc'),
      limit(100),
    ]),
  listCompletedSessionsByDefinition: (
    teamId,
    seasonId,
    testDefinitionId,
    testDefinitionVersion,
  ) =>
    many('testSessions', testSessionSchema, [
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      where('testDefinitionId', '==', testDefinitionId),
      where('testDefinitionVersion', '==', testDefinitionVersion),
      where('status', '==', 'COMPLETED'),
      orderBy('date', 'desc'),
      limit(100),
    ]),
  listResultsByDefinition: (
    teamId,
    seasonId,
    testDefinitionId,
    testDefinitionVersion,
  ) =>
    many('testResults', testResultSchema, [
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      where('testDefinitionId', '==', testDefinitionId),
      where('testDefinitionVersion', '==', testDefinitionVersion),
      limit(500),
    ]),
  getCategory: (categoryId) => one('categories', categoryId, categorySchema),
  getSubCategories: (ids) =>
    ids.length
      ? many('subCategories', subCategorySchema, [
          where(documentId(), 'in', ids.slice(0, 30)),
        ])
      : Promise.resolve([]),
  getResultsBySession: (testSessionId, teamId, seasonId) =>
    many('testResults', testResultSchema, [
      where('testSessionId', '==', testSessionId),
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      limit(100),
    ]),
  getResultsForDeletion: (testSessionId, teamId, seasonId) =>
    many('testResults', testResultSchema, [
      where('testSessionId', '==', testSessionId),
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      limit(500),
    ]),
  saveResults: (results) =>
    setMany(
      results.map((value) => ({
        path: 'testResults',
        id: value.testResultId,
        data: {
          ...toTestResultDocument(value),
          updatedAt: serverTimestamp(),
        },
      })),
    ),
  completeSession: (session, results) =>
    commitWrites(
      results.map((value) => ({
        path: 'testResults',
        id: value.testResultId,
        data: {
          ...toTestResultDocument(value),
          updatedAt: serverTimestamp(),
        },
      })),
      [
        {
          path: 'testSessions',
          id: session.testSessionId,
          data: { status: 'COMPLETED', updatedAt: serverTimestamp() },
        },
      ],
    ),
  deleteSessionWithResults: (session, results) =>
    deleteMany([
      ...results.map((result) => ({
        path: 'testResults',
        id: result.testResultId,
      })),
      { path: 'testSessions', id: session.testSessionId },
    ]),
}

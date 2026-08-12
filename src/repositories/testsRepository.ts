import { limit, orderBy, serverTimestamp, where } from 'firebase/firestore'
import type {
  TestBenchmark,
  TestDefinition,
  TestResult,
  TestSession,
} from '../types/domain'
import {
  testBenchmarkSchema,
  testDefinitionSchema,
  testResultSchema,
  testSessionSchema,
} from '../validation/schemas'
import {
  commitWrites,
  many,
  one,
  set,
  setMany,
  update,
} from './firestoreRepository'

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
  saveResults(results: TestResult[]): Promise<void>
  completeSession(session: TestSession, results: TestResult[]): Promise<void>
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
  createSession: (session) =>
    set('testSessions', session.testSessionId, {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  updateSession: (id, data) => update('testSessions', id, data),
  getSessionById: (id) => one('testSessions', id, testSessionSchema),
  listSessions: (teamId, seasonId) =>
    many('testSessions', testSessionSchema, [
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      orderBy('date', 'desc'),
      limit(100),
    ]),
  getResultsBySession: (testSessionId, teamId, seasonId) =>
    many('testResults', testResultSchema, [
      where('testSessionId', '==', testSessionId),
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      limit(100),
    ]),
  saveResults: (results) =>
    setMany(
      results.map((result) => ({
        path: 'testResults',
        id: result.testResultId,
        data: {
          ...result,
          updatedAt: serverTimestamp(),
        },
      })),
    ),
  completeSession: (session, results) =>
    commitWrites(
      results.map((result) => ({
        path: 'testResults',
        id: result.testResultId,
        data: {
          ...result,
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
}

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const projectId = 'demo-coachpulse-v2'
const seasonId = 'season-active'
let testEnv: RulesTestEnvironment

const securityContext = (activeRoleId: string, activeTeamId = 'team-a') => ({
  activeRoleId,
  activeTeamId,
  activeSeasonId: seasonId,
})

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const write = (path: string, data: object) => setDoc(doc(db, path), data)
    await Promise.all([
      write('roles/coach', { isActive: true }),
      write('roles/analyst', { isActive: true }),
      write('roles/reader', { isActive: true }),
      write('roles/admin', { isActive: true }),
      write('roles/manager', { isActive: true }),
      write('roles/inactive-role', { isActive: false }),
      write('users/user-a', {
        status: 'ACTIVE',
        roleIds: ['coach', 'analyst', 'reader', 'manager', 'inactive-role'],
        securityContext: securityContext('coach'),
      }),
      write('users/user-disabled', {
        status: 'INACTIVE',
        roleIds: ['coach'],
        securityContext: securityContext('coach'),
      }),
      write('users/user-no-access', {
        status: 'ACTIVE',
        roleIds: ['coach'],
        securityContext: securityContext('coach'),
      }),
      write('users/user-expired', {
        status: 'ACTIVE',
        roleIds: ['coach'],
        securityContext: securityContext('coach'),
      }),
      write('users/user-forged-role', {
        status: 'ACTIVE',
        roleIds: ['coach'],
        securityContext: securityContext('admin'),
      }),
      write('userTeamAccess/user-a_team-a', {
        userId: 'user-a',
        teamId: 'team-a',
        status: 'ACTIVE',
        rolePermissions: {
          coach: {
            permissions: [
              'players.read',
              'tests.read',
              'tests.write',
              'attendance.read',
            ],
            medicalAccessLevel: 'NONE',
          },
          analyst: { permissions: [], medicalAccessLevel: 'NONE' },
          reader: { permissions: ['tests.read'], medicalAccessLevel: 'NONE' },
          manager: {
            permissions: ['tests.read', 'tests.manage'],
            medicalAccessLevel: 'NONE',
          },
          'inactive-role': {
            permissions: ['players.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      }),
      write('userTeamAccess/user-a_team-b', {
        userId: 'user-a',
        teamId: 'team-b',
        status: 'ACTIVE',
        rolePermissions: {
          coach: {
            permissions: ['players.read', 'tests.read', 'attendance.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      }),
      write('userTeamAccess/user-disabled_team-a', {
        userId: 'user-disabled',
        teamId: 'team-a',
        status: 'ACTIVE',
        rolePermissions: {
          coach: {
            permissions: ['players.read', 'tests.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      }),
      write('userTeamAccess/user-expired_team-a', {
        userId: 'user-expired',
        teamId: 'team-a',
        status: 'ACTIVE',
        endDate: new Date('2020-01-01T00:00:00.000Z'),
        rolePermissions: {
          coach: {
            permissions: ['players.read', 'tests.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      }),
      write('userTeamAccess/user-forged-role_team-a', {
        userId: 'user-forged-role',
        teamId: 'team-a',
        status: 'ACTIVE',
        rolePermissions: {
          admin: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
        },
      }),
      write('teams/team-a', {
        name: 'A',
        teamType: 'DEVELOPMENT',
        categoryId: 'category-a',
        seasonId,
        status: 'ACTIVE',
      }),
      write('teams/team-b', {
        name: 'B',
        teamType: 'DEVELOPMENT',
        categoryId: 'category-b',
        seasonId,
        status: 'ACTIVE',
      }),
      write('categories/category-a', {
        seasonId,
        subCategoryIds: ['subcat-a'],
        status: 'ACTIVE',
      }),
      write('categories/category-b', {
        seasonId,
        subCategoryIds: ['subcat-b'],
        status: 'ACTIVE',
      }),
      write('subCategories/subcat-a', { seasonId, name: 'U13' }),
      write('subCategories/subcat-b', { seasonId, name: 'U14' }),
      write('testDefinitions/juggling-v1', {
        status: 'ACTIVE',
        version: 1,
      }),
      write('testSessions/session-existing', {
        testDefinitionId: 'juggling-v1',
        testDefinitionVersion: 1,
        teamId: 'team-a',
        seasonId,
        categoryId: 'category-a',
        date: new Date('2026-08-12T00:00:00.000Z'),
        status: 'DRAFT',
        createdBy: 'user-a',
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        updatedAt: new Date('2026-08-12T00:00:00.000Z'),
      }),
      write('testResults/session-existing_player-a', {
        testSessionId: 'session-existing',
        testDefinitionId: 'juggling-v1',
        testDefinitionVersion: 1,
        playerId: 'player-a',
        teamId: 'team-a',
        seasonId,
        values: { STRONG_FOOT: 0 },
        contextSnapshot: { preferredFoot: 'RIGHT' },
        createdBy: 'user-a',
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        updatedAt: new Date('2026-08-12T00:00:00.000Z'),
      }),
      write('testBenchmarks/benchmark-a', {
        testDefinitionId: 'juggling-v1',
        testDefinitionVersion: 1,
        metricKey: 'STRONG_FOOT',
        subCategoryId: 'subcat-a',
        seasonId,
        status: 'ACTIVE',
      }),
      write('testBenchmarks/benchmark-b', {
        testDefinitionId: 'juggling-v1',
        testDefinitionVersion: 1,
        metricKey: 'STRONG_FOOT',
        subCategoryId: 'subcat-b',
        seasonId,
        status: 'ACTIVE',
      }),
      write('sessions/training-a', {
        seasonId,
        categoryId: 'category-a',
        sessionType: 'TRAINING',
        startDateTime: new Date('2026-08-12T18:00:00.000Z'),
        plannedDurationMinutes: 90,
        status: 'COMPLETED',
        createdByUserId: 'user-a',
        createdAt: new Date('2026-08-12T17:00:00.000Z'),
        updatedAt: new Date('2026-08-12T17:00:00.000Z'),
      }),
      write('sessions/training-b', {
        seasonId,
        categoryId: 'category-b',
        sessionType: 'TRAINING',
        startDateTime: new Date('2026-08-12T18:00:00.000Z'),
        plannedDurationMinutes: 90,
        status: 'COMPLETED',
        createdByUserId: 'user-a',
        createdAt: new Date('2026-08-12T17:00:00.000Z'),
        updatedAt: new Date('2026-08-12T17:00:00.000Z'),
      }),
      write('sessionParticipants/training-a_player-a', {
        sessionId: 'training-a',
        playerId: 'player-a',
        participationType: 'EXPECTED',
        createdAt: new Date('2026-08-12T17:00:00.000Z'),
        updatedAt: new Date('2026-08-12T17:00:00.000Z'),
      }),
      write('sessionParticipants/training-b_player-b', {
        sessionId: 'training-b',
        playerId: 'player-b',
        participationType: 'EXPECTED',
        createdAt: new Date('2026-08-12T17:00:00.000Z'),
        updatedAt: new Date('2026-08-12T17:00:00.000Z'),
      }),
      write('attendance/training-a_player-a', {
        sessionId: 'training-a',
        playerId: 'player-a',
        status: 'PRESENT',
        recordedByUserId: 'user-a',
        createdAt: new Date('2026-08-12T20:00:00.000Z'),
        updatedAt: new Date('2026-08-12T20:00:00.000Z'),
      }),
      write('attendance/training-b_player-b', {
        sessionId: 'training-b',
        playerId: 'player-b',
        status: 'PRESENT',
        recordedByUserId: 'user-a',
        createdAt: new Date('2026-08-12T20:00:00.000Z'),
        updatedAt: new Date('2026-08-12T20:00:00.000Z'),
      }),
      write(`seasons/${seasonId}`, {
        name: '2026-2027',
        status: 'ACTIVE',
        isActive: true,
      }),
      write('players/player-a', { status: 'ACTIVE' }),
      write('players/player-b', { status: 'ACTIVE' }),
      write('players/player-c', { status: 'ACTIVE' }),
      write('playerTeamAssignments/assignment-a', {
        playerId: 'player-a',
        teamId: 'team-a',
        seasonId,
        status: 'ACTIVE',
      }),
      write('playerTeamAssignments/assignment-b', {
        playerId: 'player-b',
        teamId: 'team-b',
        seasonId,
        status: 'ACTIVE',
      }),
      write(`playerAccessScopes/player-a_team-a_${seasonId}`, {
        playerId: 'player-a',
        teamId: 'team-a',
        seasonId,
        status: 'ACTIVE',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        source: 'PLAYER_TEAM_ASSIGNMENT',
      }),
      write(`playerAccessScopes/player-b_team-b_${seasonId}`, {
        playerId: 'player-b',
        teamId: 'team-b',
        seasonId,
        status: 'ACTIVE',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        source: 'PLAYER_TEAM_ASSIGNMENT',
      }),
      write(`playerAccessScopes/player-c_team-a_${seasonId}`, {
        playerId: 'player-c',
        teamId: 'team-a',
        seasonId,
        status: 'ACTIVE',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        source: 'PLAYER_TEAM_ASSIGNMENT',
      }),
    ])
  })
})

describe('Security Rules du domaine Tests PR06', () => {
  const definitions = (uid?: string) => {
    const db = uid
      ? testEnv.authenticatedContext(uid).firestore()
      : testEnv.unauthenticatedContext().firestore()
    return getDocs(
      query(
        collection(db, 'testDefinitions'),
        where('status', '==', 'ACTIVE'),
        limit(50),
      ),
    )
  }

  it('refuse les lectures non authentifiées et les utilisateurs désactivés', async () => {
    await assertFails(definitions())
    await assertFails(definitions('user-disabled'))
  })

  it('refuse un rôle sans tests.read et la falsification du rôle actif', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('analyst'),
      }),
    )
    await assertFails(definitions('user-a'))
    await assertFails(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('admin'),
      }),
    )
  })

  it('autorise tests.read dans le contexte Team actif', async () => {
    await assertSucceeds(definitions('user-a'))
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'testDefinitions/juggling-v1')))
    await assertSucceeds(getDoc(doc(db, 'testBenchmarks/benchmark-a')))
    await assertSucceeds(getDoc(doc(db, 'subCategories/subcat-a')))
    await assertFails(getDoc(doc(db, 'subCategories/subcat-b')))
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('status', '==', 'ACTIVE'),
          where('subCategoryId', '==', 'subcat-a'),
          where('seasonId', '==', seasonId),
          where('testDefinitionId', '==', 'juggling-v1'),
          limit(100),
        ),
      ),
    )
  })

  it('refuse un benchmark hors de la Category active', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(getDoc(doc(db, 'testBenchmarks/benchmark-b')))
    await assertFails(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('status', '==', 'ACTIVE'),
          where('subCategoryId', '==', 'subcat-b'),
          where('seasonId', '==', seasonId),
        ),
      ),
    )
  })

  it('refuse toute écriture client sur les définitions et benchmarks', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(
      setDoc(doc(db, 'testDefinitions/new-test'), { status: 'ACTIVE' }),
    )
    await assertFails(
      setDoc(doc(db, 'testBenchmarks/new-benchmark'), {
        status: 'ACTIVE',
      }),
    )
  })
})

describe('Security Rules administration Tests PR09', () => {
  const definitionData = (overrides: Record<string, unknown> = {}) => ({
    name: 'Agilité 5-10-5 DEV',
    code: 'AGILITY_5_10_5',
    domain: 'PHYSICAL',
    status: 'DRAFT',
    version: 1,
    metrics: [],
    createdBy: 'user-a',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  it('distingue tests.write de tests.manage pour les définitions', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(
      setDoc(doc(db, 'testDefinitions/test-agility-v1'), definitionData()),
    )
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('manager'),
      }),
    )
    await assertSucceeds(
      setDoc(doc(db, 'testDefinitions/test-agility-v1'), definitionData()),
    )
  })

  it('autorise activation valide puis interdit la mutation structurelle ACTIVE', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await updateDoc(doc(db, 'users/user-a'), {
      securityContext: securityContext('manager'),
    })
    const reference = doc(db, 'testDefinitions/test-agility-v1')
    await setDoc(reference, definitionData())
    await assertSucceeds(
      updateDoc(reference, {
        metrics: [
          {
            metricKey: 'HEIGHT',
            label: 'Hauteur',
            valueType: 'NUMBER',
            unit: 'CENTIMETER',
            direction: 'HIGHER_IS_BETTER',
            required: true,
            minValue: 0,
            maxValue: 100,
            precision: 0,
            order: 0,
          },
        ],
        updatedAt: serverTimestamp(),
      }),
    )
    expect((await getDoc(reference)).data()?.metrics[0]?.metricKey).toBe(
      'HEIGHT',
    )
    await assertSucceeds(
      updateDoc(reference, {
        status: 'ACTIVE',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        name: 'Mutation interdite',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(reference, {
        status: 'ARCHIVED',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('réserve les benchmarks au manager et au contexte de sous-catégorie actif', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    const data = {
      testDefinitionId: 'test-vertical-jump-v1',
      testDefinitionVersion: 1,
      metricKey: 'HEIGHT',
      subCategoryId: 'subcat-a',
      seasonId,
      benchmarkLevel: 'TARGET',
      targetValue: 35,
      status: 'ACTIVE',
      createdBy: 'user-a',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    await assertFails(deleteDoc(doc(db, 'testBenchmarks/benchmark-a')))
    await assertFails(setDoc(doc(db, 'testBenchmarks/new-target'), data))
    await updateDoc(doc(db, 'users/user-a'), {
      securityContext: securityContext('manager'),
    })
    await assertSucceeds(
      setDoc(
        doc(db, 'testDefinitions/test-vertical-jump-v1'),
        definitionData({
          name: 'Détente verticale',
          code: 'VERTICAL_JUMP',
          metrics: [
            {
              metricKey: 'HEIGHT',
              label: 'Hauteur',
              valueType: 'NUMBER',
              unit: 'CENTIMETER',
              direction: 'HIGHER_IS_BETTER',
              precision: 0,
              minValue: 0,
              maxValue: 100,
              required: true,
              order: 0,
            },
          ],
        }),
      ),
    )
    await assertSucceeds(setDoc(doc(db, 'testBenchmarks/new-target'), data))
    await assertSucceeds(
      updateDoc(doc(db, 'testBenchmarks/new-target'), {
        status: 'ARCHIVED',
        updatedAt: serverTimestamp(),
      }),
    )
    const visibleBenchmarks = await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('testDefinitionId', '==', 'test-vertical-jump-v1'),
          where('testDefinitionVersion', '==', 1),
          where('seasonId', '==', seasonId),
          where('subCategoryId', '==', 'subcat-a'),
        ),
      ),
    )
    expect(visibleBenchmarks.docs.map(({ id }) => id)).toContain('new-target')
    expect(
      visibleBenchmarks.docs.find(({ id }) => id === 'new-target')?.data()
        .status,
    ).toBe('ARCHIVED')
    await assertSucceeds(deleteDoc(doc(db, 'testBenchmarks/new-target')))
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore()
      expect(
        (await getDoc(doc(admin, 'testBenchmarks/new-target'))).exists(),
      ).toBe(false)
      expect(
        (
          await getDoc(doc(admin, 'testDefinitions/test-vertical-jump-v1'))
        ).exists(),
      ).toBe(true)
    })
    await assertFails(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('testDefinitionId', '==', 'test-vertical-jump-v1'),
          where('testDefinitionVersion', '==', 1),
          where('seasonId', '==', seasonId),
        ),
      ),
    )
    await assertFails(
      setDoc(doc(db, 'testBenchmarks/outside-target'), {
        ...data,
        subCategoryId: 'subcat-b',
      }),
    )
    const forged = testEnv.authenticatedContext('user-forged-role').firestore()
    await assertFails(setDoc(doc(forged, 'testBenchmarks/forged-target'), data))
  })

  it('refuse utilisateur désactivé et rôle falsifié', async () => {
    const disabled = testEnv.authenticatedContext('user-disabled').firestore()
    const forged = testEnv.authenticatedContext('user-forged-role').firestore()
    await assertFails(
      setDoc(
        doc(disabled, 'testDefinitions/disabled-v1'),
        definitionData({ createdBy: 'user-disabled' }),
      ),
    )
    await assertFails(
      setDoc(
        doc(forged, 'testDefinitions/forged-v1'),
        definitionData({ createdBy: 'user-forged-role' }),
      ),
    )
  })
})

describe('Security Rules Présences fiche joueuse', () => {
  const activeDb = () => testEnv.authenticatedContext('user-a').firestore()

  it('autorise les queries exactes dans la Team active avec attendance.read', async () => {
    const db = activeDb()
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'sessions'),
          where('seasonId', '==', seasonId),
          where('categoryId', '==', 'category-a'),
          where('status', '==', 'COMPLETED'),
          where('startDateTime', '<=', new Date('2026-08-19T00:00:00.000Z')),
          orderBy('startDateTime', 'desc'),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'sessionParticipants'),
          where(documentId(), 'in', ['training-a_player-a']),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'attendance'),
          where(documentId(), 'in', ['training-a_player-a']),
        ),
      ),
    )
  })

  it('autorise la query Sessions exacte quand le résultat DEV est vide', async () => {
    const snapshot = await assertSucceeds(
      getDocs(
        query(
          collection(activeDb(), 'sessions'),
          where('seasonId', '==', seasonId),
          where('categoryId', '==', 'category-a'),
          where('status', '==', 'COMPLETED'),
          where('startDateTime', '<=', new Date('2026-08-01T00:00:00.000Z')),
          orderBy('startDateTime', 'desc'),
        ),
      ),
    )
    expect(snapshot.empty).toBe(true)
  })

  it('autorise la même query et le scope joueuse après passage U13F vers U14F', async () => {
    const db = activeDb()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('coach', 'team-b'),
      }),
    )
    const sessions = await assertSucceeds(
      getDocs(
        query(
          collection(db, 'sessions'),
          where('seasonId', '==', seasonId),
          where('categoryId', '==', 'category-b'),
          where('status', '==', 'COMPLETED'),
          where('startDateTime', '<=', new Date('2026-08-19T00:00:00.000Z')),
          orderBy('startDateTime', 'desc'),
        ),
      ),
    )
    expect(sessions.docs.map(({ id }) => id)).toEqual(['training-b'])
    await assertSucceeds(
      getDoc(doc(db, 'sessionParticipants/training-b_player-b')),
    )
    await assertSucceeds(getDoc(doc(db, 'attendance/training-b_player-b')))
    await assertFails(getDoc(doc(db, 'attendance/training-a_player-a')))
  })

  it('refuse permission absente, Team étrangère et joueuse hors scope', async () => {
    const db = activeDb()
    await updateDoc(doc(db, 'users/user-a'), {
      securityContext: securityContext('analyst'),
    })
    await assertFails(getDoc(doc(db, 'attendance/training-a_player-a')))
    await updateDoc(doc(db, 'users/user-a'), {
      securityContext: securityContext('coach'),
    })
    await assertFails(getDoc(doc(db, 'attendance/training-b_player-b')))
    await testEnv.withSecurityRulesDisabled((context) =>
      setDoc(doc(context.firestore(), 'attendance/training-a_player-z'), {
        sessionId: 'training-a',
        playerId: 'player-z',
        status: 'PRESENT',
      }),
    )
    await assertFails(getDoc(doc(db, 'attendance/training-a_player-z')))
  })

  it('refuse un utilisateur désactivé', async () => {
    const db = testEnv.authenticatedContext('user-disabled').firestore()
    await assertFails(getDoc(doc(db, 'sessions/training-a')))
    await assertFails(getDoc(doc(db, 'attendance/training-a_player-a')))
  })
})

describe('Security Rules TestSession/TestResult PR07', () => {
  const sessionData = (overrides: Record<string, unknown> = {}) => ({
    testDefinitionId: 'juggling-v1',
    testDefinitionVersion: 1,
    teamId: 'team-a',
    seasonId,
    categoryId: 'category-a',
    date: new Date('2026-08-12T00:00:00.000Z'),
    status: 'DRAFT',
    createdBy: 'user-a',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  it('refuse les lectures non authentifiées, désactivées et sans tests.read', async () => {
    await assertFails(
      getDoc(
        doc(
          testEnv.unauthenticatedContext().firestore(),
          'testSessions/session-existing',
        ),
      ),
    )
    await assertFails(
      getDoc(
        doc(
          testEnv.authenticatedContext('user-disabled').firestore(),
          'testSessions/session-existing',
        ),
      ),
    )
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('analyst'),
      }),
    )
    await assertFails(getDoc(doc(db, 'testSessions/session-existing')))
  })

  it('distingue tests.read de tests.write', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('reader'),
      }),
    )
    await assertSucceeds(getDoc(doc(db, 'testSessions/session-existing')))
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testSessions'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testResults'),
          where('testSessionId', '==', 'session-existing'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
        ),
      ),
    )
    await assertFails(
      setDoc(doc(db, 'testSessions/reader-session'), sessionData()),
    )
  })

  it('autorise la query réelle sur une collection testSessions vide', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocs(
        collection(context.firestore(), 'testSessions'),
      )
      await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)))
    })
    const db = testEnv.authenticatedContext('user-a').firestore()
    const snapshot = await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testSessions'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          orderBy('date', 'desc'),
          limit(100),
        ),
      ),
    )
    expect(snapshot.empty).toBe(true)
    expect(snapshot.docs).toEqual([])
  })

  it('sécurise les queries exactes de l’historique individuel PR10', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('reader'),
      }),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'playerTeamAssignments'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          where('status', '==', 'ACTIVE'),
        ),
      ),
    )
    await assertSucceeds(getDoc(doc(db, 'players/player-a')))
    await assertFails(getDoc(doc(db, 'players/player-b')))
    const results = await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testResults'),
          where('playerId', '==', 'player-a'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          limit(500),
        ),
      ),
    )
    expect(results.docs).toHaveLength(1)
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testSessions'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          where('status', '==', 'COMPLETED'),
          orderBy('date', 'desc'),
          limit(200),
        ),
      ),
    )
    await assertFails(
      getDocs(
        query(
          collection(db, 'testResults'),
          where('playerId', '==', 'player-b'),
          where('teamId', '==', 'team-b'),
          where('seasonId', '==', seasonId),
          limit(500),
        ),
      ),
    )

    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('analyst'),
      }),
    )
    await assertFails(
      getDocs(
        query(
          collection(db, 'testResults'),
          where('playerId', '==', 'player-a'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          limit(500),
        ),
      ),
    )
  })

  it('autorise une session du contexte actif et refuse Team, saison ou version incohérente', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(setDoc(doc(db, 'testSessions/valid'), sessionData()))
    await assertFails(
      setDoc(
        doc(db, 'testSessions/wrong-team'),
        sessionData({ teamId: 'team-b', categoryId: 'category-b' }),
      ),
    )
    await assertFails(
      setDoc(
        doc(db, 'testSessions/wrong-season'),
        sessionData({ seasonId: 'other-season' }),
      ),
    )
    await assertFails(
      setDoc(
        doc(db, 'testSessions/wrong-version'),
        sessionData({ testDefinitionVersion: 2 }),
      ),
    )
  })

  it('autorise un résultat canonique, y compris zéro, et refuse player hors scope', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    const result = (playerId: string) => ({
      testSessionId: 'session-existing',
      testDefinitionId: 'juggling-v1',
      testDefinitionVersion: 1,
      playerId,
      teamId: 'team-a',
      seasonId,
      values: { STRONG_FOOT: 0 },
      contextSnapshot: { preferredFoot: 'RIGHT' },
      createdBy: 'user-a',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(
      setDoc(
        doc(db, 'testResults/session-existing_player-c'),
        result('player-c'),
      ),
    )
    await assertFails(
      setDoc(
        doc(db, 'testResults/session-existing_player-b'),
        result('player-b'),
      ),
    )
    await assertFails(
      setDoc(doc(db, 'testResults/duplicate-id'), result('player-a')),
    )
  })

  it('finalise une session DRAFT et interdit ensuite les corrections ordinaires', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'testSessions/session-existing'), {
        status: 'COMPLETED',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(doc(db, 'testResults/session-existing_player-a'), {
        values: { STRONG_FOOT: 12 },
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('autorise la suppression atomique DRAFT avec ses résultats', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'testResults/session-existing_player-a'))
    batch.delete(doc(db, 'testSessions/session-existing'))
    await assertSucceeds(batch.commit())
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore()
      expect(
        (await getDoc(doc(admin, 'testSessions/session-existing'))).exists(),
      ).toBe(false)
      expect(
        (
          await getDocs(
            query(
              collection(admin, 'testResults'),
              where('testSessionId', '==', 'session-existing'),
            ),
          )
        ).empty,
      ).toBe(true)
    })
  })

  it('autorise la suppression d’une session DRAFT vide', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'testSessions/empty-draft'),
        sessionData(),
      )
    })
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(deleteDoc(doc(db, 'testSessions/empty-draft')))
    await testEnv.withSecurityRulesDisabled(async (context) => {
      expect(
        (
          await getDoc(doc(context.firestore(), 'testSessions/empty-draft'))
        ).exists(),
      ).toBe(false)
    })
  })

  it('autorise la suppression confirmée côté UI d’une session COMPLETED', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(context.firestore(), 'testSessions/session-existing'),
        { status: 'COMPLETED' },
      )
    })
    const db = testEnv.authenticatedContext('user-a').firestore()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'testResults/session-existing_player-a'))
    batch.delete(doc(db, 'testSessions/session-existing'))
    await assertSucceeds(batch.commit())
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore()
      expect(
        (await getDoc(doc(admin, 'testSessions/session-existing'))).exists(),
      ).toBe(false)
      expect(
        (
          await getDoc(doc(admin, 'testResults/session-existing_player-a'))
        ).exists(),
      ).toBe(false)
    })
  })

  it('refuse delete sans tests.write, autre Team ou autre saison', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('reader'),
      }),
    )
    await assertFails(deleteDoc(doc(db, 'testSessions/session-existing')))

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore()
      await setDoc(
        doc(admin, 'testSessions/other-team'),
        sessionData({ teamId: 'team-b', categoryId: 'category-b' }),
      )
      await setDoc(
        doc(admin, 'testSessions/other-season'),
        sessionData({ seasonId: 'other-season' }),
      )
    })
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('coach'),
      }),
    )
    await assertFails(deleteDoc(doc(db, 'testSessions/other-team')))
    await assertFails(deleteDoc(doc(db, 'testSessions/other-season')))
  })

  it('refuse la suppression d’un TestResult hors scope', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'testResults/out-of-scope'), {
        testSessionId: 'session-existing',
        testDefinitionId: 'juggling-v1',
        testDefinitionVersion: 1,
        playerId: 'player-b',
        teamId: 'team-b',
        seasonId,
      })
    })
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(deleteDoc(doc(db, 'testResults/out-of-scope')))
  })
})

afterAll(async () => testEnv.cleanup())

const assignmentsForTeam = (uid: string, teamId = 'team-a') => {
  const db = testEnv.authenticatedContext(uid).firestore()
  return getDocs(
    query(
      collection(db, 'playerTeamAssignments'),
      where('teamId', '==', teamId),
      where('seasonId', '==', seasonId),
      where('status', '==', 'ACTIVE'),
    ),
  )
}

describe('Security Rules du socle et accès joueuses', () => {
  it('refuse tout accès non connecté', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'players/player-a')))
    await assertFails(getDoc(doc(db, 'playerTeamAssignments/assignment-a')))
  })

  it('refuse un utilisateur désactivé', async () => {
    await assertFails(assignmentsForTeam('user-disabled'))
  })

  it('refuse un utilisateur sans TeamAccess', async () => {
    await assertFails(assignmentsForTeam('user-no-access'))
  })

  it('refuse un TeamAccess expiré', async () => {
    await assertFails(assignmentsForTeam('user-expired'))
  })

  it('refuse un rôle non attribué ou inactif', async () => {
    await assertFails(assignmentsForTeam('user-forged-role'))
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('inactive-role'),
      }),
    )
  })

  it('refuse un rôle sans players.read', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('analyst'),
      }),
    )
    await assertFails(assignmentsForTeam('user-a'))
  })

  it('autorise le rôle attribué avec players.read et un TeamAccess valide', async () => {
    await assertSucceeds(assignmentsForTeam('user-a'))
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'players/player-a')))
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'players'),
          where(documentId(), 'in', ['player-a']),
          where('status', '==', 'ACTIVE'),
        ),
      ),
    )
    await assertSucceeds(getDoc(doc(db, 'categories/category-a')))
    await assertSucceeds(getDoc(doc(db, 'subCategories/subcat-a')))
    await assertFails(getDoc(doc(db, 'categories/category-b')))
    await assertFails(getDoc(doc(db, 'subCategories/subcat-b')))
  })

  it("refuse une joueuse d'une autre Team", async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(getDoc(doc(db, 'players/player-b')))
    await assertFails(getDoc(doc(db, 'playerTeamAssignments/assignment-b')))
  })

  it("refuse une joueuse dont le scope d'affectation est expiré", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          `playerAccessScopes/player-a_team-a_${seasonId}`,
        ),
        { endDate: new Date('2020-01-01T00:00:00.000Z') },
      )
    })
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(getDoc(doc(db, 'players/player-a')))
  })

  it('applique immédiatement un changement vers un rôle autorisé', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('analyst'),
      }),
    )
    await assertFails(assignmentsForTeam('user-a'))
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('coach'),
      }),
    )
    await assertSucceeds(assignmentsForTeam('user-a'))
  })

  it("empêche la falsification d'un roleId côté client", async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('admin'),
      }),
    )
  })

  it('refuse un accès direct hors périmètre', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(getDoc(doc(db, 'players/player-b')))
  })

  it('limite un utilisateur multi-Team à la Team du contexte actif', async () => {
    await assertSucceeds(assignmentsForTeam('user-a', 'team-a'))
    await assertFails(assignmentsForTeam('user-a', 'team-b'))
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'users/user-a'), {
        securityContext: securityContext('coach', 'team-b'),
      }),
    )
    await assertSucceeds(assignmentsForTeam('user-a', 'team-b'))
    await assertFails(getDoc(doc(db, 'players/player-a')))
    await assertSucceeds(getDoc(doc(db, 'players/player-b')))
  })

  it('préserve les lectures du socle et interdit leurs écritures', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'users/user-a')))
    await assertSucceeds(getDoc(doc(db, 'roles/coach')))
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'teams'),
          where(documentId(), 'in', ['team-a']),
          where('status', '==', 'ACTIVE'),
        ),
      ),
    )
    await assertFails(setDoc(doc(db, 'roles/coach'), { isActive: false }))
    await assertFails(
      updateDoc(doc(db, 'users/user-a'), { status: 'INACTIVE' }),
    )
  })

  it('autorise uniquement les référentiels Category et SubCategory du contexte Tests actif', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'categories/category-a')))
    await assertSucceeds(getDoc(doc(db, 'subCategories/subcat-a')))
    await assertFails(getDoc(doc(db, 'categories/category-b')))
    await assertFails(getDoc(doc(db, 'subCategories/subcat-b')))
  })

  it('autorise les formes de requêtes analytics filtrées au contexte actif', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testSessions'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          where('testDefinitionId', '==', 'juggling-v1'),
          where('testDefinitionVersion', '==', 1),
          where('status', '==', 'COMPLETED'),
          orderBy('date', 'desc'),
          limit(100),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testResults'),
          where('teamId', '==', 'team-a'),
          where('seasonId', '==', seasonId),
          where('testDefinitionId', '==', 'juggling-v1'),
          where('testDefinitionVersion', '==', 1),
          limit(500),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('status', '==', 'ACTIVE'),
          where('subCategoryId', '==', 'subcat-a'),
          where('seasonId', '==', seasonId),
          where('testDefinitionId', '==', 'juggling-v1'),
          limit(100),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'subCategories'),
          where(documentId(), 'in', ['subcat-a']),
        ),
      ),
    )
  })
})

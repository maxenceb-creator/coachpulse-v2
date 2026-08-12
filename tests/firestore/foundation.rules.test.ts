import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

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
      write('roles/admin', { isActive: true }),
      write('roles/inactive-role', { isActive: false }),
      write('users/user-a', {
        status: 'ACTIVE',
        roleIds: ['coach', 'analyst', 'inactive-role'],
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
            permissions: ['players.read', 'tests.read'],
            medicalAccessLevel: 'NONE',
          },
          analyst: { permissions: [], medicalAccessLevel: 'NONE' },
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
            permissions: ['players.read', 'tests.read'],
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
      write(`seasons/${seasonId}`, {
        name: '2026-2027',
        status: 'ACTIVE',
        isActive: true,
      }),
      write('players/player-a', { status: 'ACTIVE' }),
      write('players/player-b', { status: 'ACTIVE' }),
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
    ])
  })
})

describe('Security Rules du domaine Tests PR06', () => {
  const definitions = (uid?: string) => {
    const db = uid
      ? testEnv.authenticatedContext(uid).firestore()
      : testEnv.unauthenticatedContext().firestore()
    return getDocs(
      query(collection(db, 'testDefinitions'), where('status', '==', 'ACTIVE')),
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
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'testBenchmarks'),
          where('status', '==', 'ACTIVE'),
          where('subCategoryId', '==', 'subcat-a'),
          where('seasonId', '==', seasonId),
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
})

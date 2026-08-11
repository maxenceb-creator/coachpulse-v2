import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const projectId = 'demo-coachpulse-v2'
let testEnv: RulesTestEnvironment

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
    await setDoc(doc(db, 'users/user-a'), {
      status: 'ACTIVE',
      roleIds: ['coach'],
    })
    await setDoc(doc(db, 'users/user-b'), {
      status: 'ACTIVE',
      roleIds: ['doctor'],
    })
    await setDoc(doc(db, 'roles/coach'), { label: 'Coach' })
    await setDoc(doc(db, 'roles/doctor'), { label: 'Médecin' })
    await setDoc(doc(db, 'userTeamAccess/user-a_team-a'), {
      userId: 'user-a',
      teamId: 'team-a',
      status: 'ACTIVE',
      rolePermissions: {
        coach: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
      },
    })
    await setDoc(doc(db, 'userTeamAccess/user-b_team-b'), {
      userId: 'user-b',
      teamId: 'team-b',
      status: 'ACTIVE',
      rolePermissions: {
        doctor: {
          permissions: ['medical.read'],
          medicalAccessLevel: 'MEDICAL',
        },
      },
    })
  })
})

afterAll(async () => testEnv.cleanup())

describe('Security Rules du socle', () => {
  it('refuse tout accès non connecté', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/user-a')))
    await assertFails(getDoc(doc(db, 'roles/coach')))
    await assertFails(getDoc(doc(db, 'userTeamAccess/user-a_team-a')))
  })

  it('autorise un utilisateur actif à lire son propre profil', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'users/user-a')))
  })

  it('refuse la lecture croisée des profils', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(getDoc(doc(db, 'users/user-b')))
  })

  it('autorise uniquement les rôles attribués à l’utilisateur', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'roles/coach')))
    await assertFails(getDoc(doc(db, 'roles/doctor')))
  })

  it('autorise uniquement ses propres TeamAccess', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'userTeamAccess/user-a_team-a')))
    await assertFails(getDoc(doc(db, 'userTeamAccess/user-b_team-b')))
  })

  it('refuse les écritures client sur les collections du socle', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore()
    await assertFails(setDoc(doc(db, 'users/user-a'), { status: 'SUSPENDED' }))
    await assertFails(setDoc(doc(db, 'roles/coach'), { label: 'Admin' }))
    await assertFails(
      setDoc(doc(db, 'userTeamAccess/user-a_team-a'), { status: 'INACTIVE' }),
    )
  })
})

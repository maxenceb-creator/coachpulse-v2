import { describe, expect, it } from 'vitest'
import type { TeamAccess, TestDefinition } from '../types/domain'
import { isTestDefinitionAdminQueryEnabled } from '../hooks/useTestsCatalogue'
import { resolveTestDefinitionAdminViewState } from './testDefinitionAdminState'

const access: TeamAccess = {
  userTeamAccessId: 'user_team',
  userId: 'user',
  teamId: 'team',
  status: 'ACTIVE',
  rolePermissions: {
    role: {
      permissions: ['tests.read', 'tests.manage'],
      medicalAccessLevel: 'NONE',
    },
  },
}

const context = (securityContextReady: boolean) => ({
  userId: 'user',
  activeRoleId: 'role',
  teamId: 'team',
  seasonId: 'season',
  categoryId: 'category',
  accesses: [access],
  securityContextReady,
})

const definition = (status: TestDefinition['status']): TestDefinition => ({
  testDefinitionId: 'test-juggling-v1',
  name: 'Jongles',
  code: 'JUGGLING',
  domain: 'TECHNICAL',
  status,
  version: 1,
  metrics: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const settled = {
  appLoading: false,
  securityContextReady: true,
  allowed: true,
  testDefinitionId: 'test-juggling-v1',
  queryPending: false,
  queryError: false,
  hasData: true,
}

describe('état de la page administration protocole', () => {
  it.each(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const)(
    'charge une définition %s existante',
    (status) => {
      expect(definition(status).testDefinitionId).toBe('test-juggling-v1')
      expect(resolveTestDefinitionAdminViewState(settled)).toBe('SUCCESS')
    },
  )

  it('affiche introuvable pour une définition absente', () => {
    expect(
      resolveTestDefinitionAdminViewState({
        ...settled,
        queryError: true,
        hasData: false,
        errorCode: 'TEST_DEFINITION_NOT_FOUND',
      }),
    ).toBe('NOT_FOUND')
  })

  it('affiche non autorisé sans tests.manage', () => {
    expect(
      resolveTestDefinitionAdminViewState({ ...settled, allowed: false }),
    ).toBe('UNAUTHORIZED')
  })

  it('déclenche la query lorsque securityContextReady passe de false à true', () => {
    expect(
      isTestDefinitionAdminQueryEnabled(context(false), 'test-juggling-v1'),
    ).toBe(false)
    expect(
      isTestDefinitionAdminQueryEnabled(context(true), 'test-juggling-v1'),
    ).toBe(true)
  })

  it('ne masque pas une erreur technique derrière le loading', () => {
    expect(
      resolveTestDefinitionAdminViewState({
        ...settled,
        queryError: true,
        hasData: false,
        errorCode: 'PERMISSION_DENIED',
      }),
    ).toBe('ERROR')
  })
})

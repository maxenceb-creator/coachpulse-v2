import { describe, expect, it } from 'vitest'
import { isSecurityContextReady, selectActiveId } from './contextSelection'

describe('sélection du contexte actif', () => {
  it('conserve une sélection encore accessible', () =>
    expect(selectActiveId(['a', 'b'], 'b', 'a')).toBe('b'))
  it('utilise la préférence autorisée', () =>
    expect(selectActiveId(['a', 'b'], undefined, 'b')).toBe('b'))
  it('revient au premier accès et jamais à un id interdit', () =>
    expect(selectActiveId(['a'], 'interdit')).toBe('a'))
  it('restaure après refresh le contexte Firestore encore autorisé', () => {
    expect(selectActiveId(['role-a', 'role-b'], undefined, 'role-b')).toBe(
      'role-b',
    )
    expect(selectActiveId(['u13', 'u14'], undefined, 'u14')).toBe('u14')
  })
})

describe('synchronisation du securityContext', () => {
  const persisted = {
    activeRoleId: 'coach',
    activeTeamId: 'u13',
    activeSeasonId: '2026',
  }

  it('bloque une query protégée tant que le nouveau contexte n’est pas confirmé', () => {
    expect(
      isSecurityContextReady(persisted, {
        activeRoleId: 'coach',
        activeTeamId: 'u14',
        activeSeasonId: '2026',
      }),
    ).toBe(false)
  })

  it('autorise une query protégée uniquement avec le contexte confirmé exact', () => {
    expect(isSecurityContextReady(persisted, persisted)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { selectActiveId } from './contextSelection'

describe('sélection du contexte actif', () => {
  it('conserve une sélection encore accessible', () =>
    expect(selectActiveId(['a', 'b'], 'b', 'a')).toBe('b'))
  it('utilise la préférence autorisée', () =>
    expect(selectActiveId(['a', 'b'], undefined, 'b')).toBe('b'))
  it('revient au premier accès et jamais à un id interdit', () =>
    expect(selectActiveId(['a'], 'interdit')).toBe('a'))
})

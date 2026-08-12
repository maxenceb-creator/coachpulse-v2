import { describe, expect, it } from 'vitest'
import type { TestResult } from '../types/domain'
import {
  toTestResultDocument,
  toTestSessionDocument,
} from './testDocumentMappers'

const now = new Date('2026-08-12T12:00:00.000Z')

describe('mappers Firestore Tests', () => {
  it('conserve testSessionId dans le chemin uniquement', () => {
    const document = toTestSessionDocument({
      testSessionId: 'session-id',
      testDefinitionId: 'definition-id',
      testDefinitionVersion: 1,
      teamId: 'team-id',
      seasonId: 'season-id',
      categoryId: 'category-id',
      date: now,
      status: 'DRAFT',
      createdBy: 'user-id',
      createdAt: now,
      updatedAt: now,
    })
    expect(document).not.toHaveProperty('testSessionId')
    expect(document.testDefinitionId).toBe('definition-id')
  })

  it('conserve testResultId dans le chemin uniquement', () => {
    const document = toTestResultDocument({
      testResultId: 'session_player',
      testSessionId: 'session',
      testDefinitionId: 'definition-id',
      testDefinitionVersion: 1,
      playerId: 'player',
      teamId: 'team-id',
      seasonId: 'season-id',
      values: { TIME: 0 },
      contextSnapshot: { preferredFoot: 'RIGHT' },
      createdBy: 'user-id',
      createdAt: now,
      updatedAt: now,
    } satisfies TestResult)
    expect(document).not.toHaveProperty('testResultId')
    expect(document.values.TIME).toBe(0)
  })
})

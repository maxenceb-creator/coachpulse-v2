import { describe, expect, it } from 'vitest'
import type { Assignment } from '../types/domain'
import { isAssignmentEffective } from './assignmentsService'

const effectiveAt = new Date('2026-10-15T12:00:00.000Z')
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  assignmentId: 'assignment-test',
  playerId: 'player-test',
  teamId: 'team-test',
  seasonId: 'season-2026-2027',
  assignmentType: 'PRIMARY',
  startDate: new Date('2026-08-01T00:00:00.000Z'),
  status: 'ACTIVE',
  ...overrides,
})

describe('affectation effective', () => {
  it('exclut une SECONDARY future même si son statut est ACTIVE', () =>
    expect(
      isAssignmentEffective(
        assignment({
          assignmentType: 'SECONDARY',
          startDate: new Date('2026-11-01T00:00:00.000Z'),
        }),
        effectiveAt,
      ),
    ).toBe(false))

  it.each([
    ['future', '2026-11-01T00:00:00.000Z', '2026-11-30T23:59:59.999Z', false],
    ['active', '2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z', true],
    ['expirée', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z', false],
  ])('évalue une TEMPORARY %s', (_label, startDate, endDate, expected) =>
    expect(
      isAssignmentEffective(
        assignment({
          assignmentType: 'TEMPORARY',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }),
        effectiveAt,
      ),
    ).toBe(expected),
  )

  it('conserve une affectation commencée sans endDate', () =>
    expect(isAssignmentEffective(assignment(), effectiveAt)).toBe(true))
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { repositories } from '../repositories/appRepositories'
import type { Assignment } from '../types/domain'
import { playersService } from './playersService'

vi.mock('../repositories/appRepositories', () => ({
  repositories: {
    assignmentsForTeam: vi.fn(),
    activePlayerCount: vi.fn(),
  },
}))

const effectiveAt = new Date('2026-10-15T12:00:00.000Z')
const assignment = (
  playerId: string,
  assignmentType: Assignment['assignmentType'],
  startDate: string,
  endDate?: string,
): Assignment => ({
  assignmentId: `assignment-${playerId}-${assignmentType}`,
  playerId,
  teamId: 'team-dev-u13f',
  seasonId: 'season-2026-2027',
  assignmentType,
  startDate: new Date(startDate),
  endDate: endDate ? new Date(endDate) : undefined,
  status: 'ACTIVE',
})

describe('comptage effectif des joueuses par Team', () => {
  afterEach(() => vi.clearAllMocks())

  it('compte uniquement les affectations effectives à la date demandée', async () => {
    vi.mocked(repositories.assignmentsForTeam).mockResolvedValue([
      assignment('secondary-future', 'SECONDARY', '2026-11-01T00:00:00.000Z'),
      assignment(
        'temporary-future',
        'TEMPORARY',
        '2026-11-01T00:00:00.000Z',
        '2026-11-30T23:59:59.999Z',
      ),
      assignment(
        'temporary-active',
        'TEMPORARY',
        '2026-10-01T00:00:00.000Z',
        '2026-10-31T23:59:59.999Z',
      ),
      assignment(
        'temporary-expired',
        'TEMPORARY',
        '2026-09-01T00:00:00.000Z',
        '2026-09-30T23:59:59.999Z',
      ),
      assignment('without-end-date', 'PRIMARY', '2026-08-01T00:00:00.000Z'),
    ])
    const count = vi.mocked(repositories.activePlayerCount).mockResolvedValue(2)

    await expect(
      playersService.countEffectiveByTeam(
        'team-dev-u13f',
        'season-2026-2027',
        'role-coach-principal',
        effectiveAt,
      ),
    ).resolves.toBe(2)
    expect(count).toHaveBeenCalledWith(['temporary-active', 'without-end-date'])
  })
})

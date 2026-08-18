import { afterEach, describe, expect, it, vi } from 'vitest'
import { repositories } from '../repositories/appRepositories'
import type { Assignment, Player, TeamAccess } from '../types/domain'
import { PlayerProfileError, playersService } from './playersService'

vi.mock('../repositories/appRepositories', () => ({
  repositories: {
    assignmentsForTeam: vi.fn(),
    activePlayerCount: vi.fn(),
    activePlayers: vi.fn(),
    category: vi.fn(),
    subCategories: vi.fn(),
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

const player: Player = {
  playerId: 'player-a',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2013-03-01T00:00:00.000Z'),
  playerProfile: 'MIDFIELDER',
  preferredFoot: 'RIGHT',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
}
const accesses: TeamAccess[] = [
  {
    userTeamAccessId: 'access-a',
    userId: 'user-a',
    teamId: 'team-dev-u13f',
    status: 'ACTIVE',
    rolePermissions: {
      coach: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
    },
  },
]
const profileContext = {
  userId: 'user-a',
  activeRoleId: 'coach',
  teamId: 'team-dev-u13f',
  seasonId: 'season-2026-2027',
  categoryId: 'category-u13',
  accesses,
}

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

describe('fiche joueuse scopée', () => {
  afterEach(() => vi.clearAllMocks())

  it('retourne identité, affectation, catégorie et sous-catégorie autorisées', async () => {
    vi.mocked(repositories.assignmentsForTeam).mockResolvedValue([
      assignment('player-a', 'PRIMARY', '2020-01-01T00:00:00.000Z'),
    ])
    vi.mocked(repositories.activePlayers).mockResolvedValue([player])
    vi.mocked(repositories.category).mockResolvedValue({
      categoryId: 'category-u13',
      seasonId: profileContext.seasonId,
      name: 'U12-U13',
      subCategoryIds: ['subcat-u13'],
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(repositories.subCategories).mockResolvedValue([
      {
        subCategoryId: 'subcat-u13',
        seasonId: profileContext.seasonId,
        name: 'U13',
        birthYearRule: 2013,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    await expect(
      playersService.getProfile(profileContext, 'player-a'),
    ).resolves.toMatchObject({
      player: { playerId: 'player-a' },
      subCategory: { name: 'U13' },
    })
  })

  it('refuse une joueuse hors du roster actif avant de lire son identité', async () => {
    vi.mocked(repositories.assignmentsForTeam).mockResolvedValue([])
    await expect(
      playersService.getProfile(profileContext, 'player-b'),
    ).rejects.toEqual(new PlayerProfileError('PLAYER_OUT_OF_SCOPE'))
    expect(repositories.activePlayers).not.toHaveBeenCalled()
  })

  it('refuse la fiche sans players.read', async () => {
    await expect(
      playersService.getProfile(
        { ...profileContext, accesses: [], teamId: 'team-b' },
        'player-a',
      ),
    ).rejects.toEqual(new PlayerProfileError('PERMISSION_DENIED'))
  })
})

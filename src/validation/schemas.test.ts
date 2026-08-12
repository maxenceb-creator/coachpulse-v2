import { describe, expect, it } from 'vitest'
import { playerSchema, teamSchema } from './schemas'
const timestamp = new Date('2026-08-01T00:00:00.000Z')
describe('validation Firestore', () => {
  it('refuse teamId dans Player', () =>
    expect(
      playerSchema.safeParse({
        playerId: 'p',
        firstName: 'A',
        lastName: 'B',
        birthDate: new Date(),
        playerProfile: 'FORWARD',
        preferredFoot: 'RIGHT',
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
        teamId: 't',
      }).success,
    ).toBe(false))
  it('accepte un Player seedé avec ses timestamps techniques', () =>
    expect(
      playerSchema.safeParse({
        playerId: 'player-alice-martin',
        firstName: 'Alice',
        lastName: 'Martin',
        birthDate: new Date('2014-03-12T00:00:00.000Z'),
        nationality: 'Fictive',
        clubArrivalDate: new Date('2025-07-01T00:00:00.000Z'),
        playerProfile: 'DEFENDER',
        preferredFoot: 'RIGHT',
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
      }).success,
    ).toBe(true))
  it('accepte le contexte FIRST_TEAM défini manuellement', () =>
    expect(
      teamSchema.safeParse({
        teamId: 't',
        name: 'Première',
        teamType: 'FIRST_TEAM',
        seasonId: 's',
        categoryId: 'c',
        status: 'ACTIVE',
      }).success,
    ).toBe(true))
  it('accepte FIRST_TEAM sans saison ni catégorie', () =>
    expect(
      teamSchema.safeParse({
        teamId: 't',
        name: 'Première',
        teamType: 'FIRST_TEAM',
        status: 'ACTIVE',
      }).success,
    ).toBe(true))
})

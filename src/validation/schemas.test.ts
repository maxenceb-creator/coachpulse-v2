import { describe, expect, it } from 'vitest'
import { playerSchema, teamSchema } from './schemas'
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
        teamId: 't',
      }).success,
    ).toBe(false))
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

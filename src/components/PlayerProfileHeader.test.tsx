import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Player } from '../types/domain'
import { PlayerProfileHeader } from './PlayerProfileHeader'

const player: Player = {
  playerId: 'player-a',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2013-03-12T00:00:00.000Z'),
  playerProfile: 'MIDFIELDER',
  preferredFoot: 'RIGHT',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('PlayerProfileHeader', () => {
  it('affiche la vraie identité et son contexte sportif', () => {
    render(
      <PlayerProfileHeader
        player={player}
        team={{
          teamId: 'team-a',
          name: 'U13F',
          teamType: 'DEVELOPMENT',
          status: 'ACTIVE',
        }}
        category={{
          categoryId: 'category-a',
          seasonId: 'season-a',
          name: 'U12-U13',
          subCategoryIds: ['u13'],
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        subCategory={{
          subCategoryId: 'u13',
          seasonId: 'season-a',
          name: 'U13',
          birthYearRule: 2013,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(screen.getByText('U13F · U12-U13 · U13')).toBeInTheDocument()
    expect(screen.getByText('Milieu')).toBeInTheDocument()
  })
})

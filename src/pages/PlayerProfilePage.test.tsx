import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerProfileError } from '../services/playersService'
import { PlayerProfilePage } from './PlayerProfilePage'

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  taxonomy: vi.fn(),
  history: vi.fn(),
  app: {
    activeRoleId: 'coach',
    activeTeamId: 'team-u14',
    season: { seasonId: 'season-a', name: '2026-2027' },
    accesses: [
      {
        userTeamAccessId: 'access-a',
        userId: 'user-a',
        teamId: 'team-u14',
        status: 'ACTIVE',
        rolePermissions: {
          coach: {
            permissions: ['players.read', 'tests.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      },
    ],
    teams: [
      {
        teamId: 'team-u14',
        name: 'U14F',
        categoryId: 'category-u14',
        teamType: 'DEVELOPMENT',
        status: 'ACTIVE',
      },
    ],
    securityContextReady: true,
    loading: false,
    error: false,
  },
}))

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'user-a' } }),
}))
vi.mock('../app/AppContext', () => ({ useApp: () => mocks.app }))
vi.mock('../hooks/usePlayerProfile', () => ({
  usePlayerProfile: mocks.profile,
  usePlayerProfileTaxonomy: mocks.taxonomy,
}))
vi.mock('../hooks/useTestPlayerHistory', () => ({
  useTestPlayerHistory: mocks.history,
}))
vi.mock('../services/playersService', () => ({
  PlayerProfileError: class PlayerProfileError extends Error {
    constructor(public readonly code: string) {
      super(code)
    }
  },
}))

const alice = {
  playerId: 'alice',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2013-01-01T00:00:00.000Z'),
  playerProfile: 'MIDFIELDER' as const,
  preferredFoot: 'RIGHT' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/players/alice']}>
      <Routes>
        <Route path="/players/:playerId" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('cycle de chargement de la fiche joueuse', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profile.mockReturnValue({
      isPending: false,
      isError: false,
      status: 'success',
      data: { player: alice, rosterCount: 1 },
    })
    mocks.taxonomy.mockReturnValue({
      isPending: false,
      isError: false,
      status: 'success',
      data: { category: null, subCategory: undefined },
    })
    mocks.history.mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { player: alice, histories: [] },
    })
  })

  it('affiche l’identité U14F pendant qu’une Promise Tests reste pending', () => {
    const neverResolvingTests = new Promise(() => undefined)
    mocks.history.mockReturnValue({
      isPending: true,
      isError: false,
      isSuccess: false,
      promise: neverResolvingTests,
    })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Chargement des tests…')).toBeInTheDocument()
  })

  it('conserve l’identité U14F si le bloc Tests échoue', () => {
    mocks.history.mockReturnValue({
      isPending: false,
      isError: true,
      status: 'error',
      isSuccess: false,
    })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Impossible de charger les tests.'),
    ).toBeInTheDocument()
  })

  it('affiche l’identité sans attendre la taxonomie', () => {
    mocks.taxonomy.mockReturnValue({ isPending: true, isError: false })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Chargement du contexte sportif…'),
    ).toBeInTheDocument()
  })

  it('refuse proprement un playerId hors scope', () => {
    mocks.profile.mockReturnValue({
      isPending: false,
      isError: true,
      error: new PlayerProfileError('PLAYER_OUT_OF_SCOPE'),
    })
    renderPage()
    expect(
      screen.getByText(
        'Cette joueuse n’est pas accessible dans le contexte actif.',
      ),
    ).toBeInTheDocument()
  })
})

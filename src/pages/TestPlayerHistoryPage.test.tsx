import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestsPage } from './TestsPage'
import { TestPlayerHistoryPage } from './TestPlayerHistoryPage'

const mocks = vi.hoisted(() => ({
  roster: vi.fn(),
  history: vi.fn(),
  app: {
    activeRoleId: 'coach',
    activeTeamId: 'team-a',
    season: { seasonId: 'season-a', name: '2026-2027' },
    accesses: [
      {
        userTeamAccessId: 'access-a',
        userId: 'user-a',
        teamId: 'team-a',
        status: 'ACTIVE',
        rolePermissions: {
          coach: {
            permissions: ['tests.read'],
            medicalAccessLevel: 'NONE',
          },
        },
      },
    ],
    teams: [
      {
        teamId: 'team-a',
        name: 'U13F',
        categoryId: 'category-a',
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
vi.mock('../hooks/useTestPlayerHistory', () => ({
  useTestPlayerRoster: mocks.roster,
  useTestPlayerHistory: mocks.history,
}))
vi.mock('../hooks/useTestDefinitions', () => ({
  useTestDefinitions: () => ({ isPending: false, isError: false, data: [] }),
}))
vi.mock('../hooks/useTestSession', () => ({
  useTestSessions: () => ({ isPending: false, isError: false, data: [] }),
  useCreateTestSession: () => ({
    isPending: false,
    isError: false,
    mutate: vi.fn(),
  }),
  useDeleteTestSession: () => ({
    isPending: false,
    isError: false,
    isSuccess: false,
    mutate: vi.fn(),
  }),
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
const lina = {
  ...alice,
  playerId: 'lina',
  firstName: 'Lina',
  lastName: 'Robert',
}

const historySuccess = {
  isPending: false,
  isError: false,
  data: { player: alice, subCategory: undefined, histories: [] },
}

let resolveSlowRoster: (() => void) | undefined
function useSlowRoster() {
  const [players, setPlayers] = useState<(typeof alice)[]>()
  useEffect(() => {
    const pending = new Promise<void>((resolve) => {
      resolveSlowRoster = resolve
    })
    void pending.then(() => setPlayers([alice]))
  }, [])
  return {
    isPending: !players,
    isFetching: !players,
    isError: false,
    status: players ? 'success' : 'pending',
    fetchStatus: players ? 'idle' : 'fetching',
    data: players,
  }
}

function TestRoutes({ initial = '/tests' }: { initial?: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/tests" element={<TestsPage />} />
        <Route
          path="/tests/players/:playerId?"
          element={<TestPlayerHistoryPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('navigation SPA vers l’historique joueuse', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.roster.mockReturnValue({
      isPending: true,
      isFetching: true,
      isError: false,
      status: 'pending',
      fetchStatus: 'fetching',
      data: undefined,
    })
    mocks.history.mockReturnValue(historySuccess)
  })

  it('affiche le sélecteur avec un roster lent puis charge sans reload', async () => {
    mocks.roster.mockImplementation(useSlowRoster)
    const view = render(<TestRoutes />)
    fireEvent.click(
      screen.getByRole('link', { name: 'Historique par joueuse' }),
    )

    expect(screen.getByLabelText('Joueuse')).toBeDisabled()
    expect(screen.getByText('Chargement des joueuses…')).toBeInTheDocument()
    expect(
      screen.getByText('Sélectionnez une joueuse pour voir son historique.'),
    ).toBeInTheDocument()
    expect(mocks.history).not.toHaveBeenCalled()

    resolveSlowRoster?.()
    await waitFor(() => expect(screen.getByLabelText('Joueuse')).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Joueuse'), {
      target: { value: 'alice' },
    })

    expect(
      screen.getByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(mocks.history).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-a', seasonId: 'season-a' }),
      'alice',
    )
    view.unmount()
  })

  it('stabilise le sélecteur quand le roster échoue', () => {
    mocks.roster.mockReturnValue({
      isPending: false,
      isFetching: false,
      isError: true,
      status: 'error',
      fetchStatus: 'idle',
      data: undefined,
    })
    render(<TestRoutes initial="/tests/players" />)
    expect(screen.getByLabelText('Joueuse')).toBeEnabled()
    expect(
      screen.getByText('Impossible de charger les joueuses.'),
    ).toBeInTheDocument()
    expect(mocks.history).not.toHaveBeenCalled()
  })

  it('supporte accès direct, retour Tests, cache chaud et nouvelle navigation', () => {
    mocks.roster.mockReturnValue({
      isPending: false,
      isFetching: false,
      isError: false,
      status: 'success',
      fetchStatus: 'idle',
      data: [alice],
    })
    render(<TestRoutes initial="/tests/players" />)
    expect(screen.getByLabelText('Joueuse')).toBeEnabled()
    expect(mocks.history).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: 'Tests' }))
    fireEvent.click(
      screen.getByRole('link', { name: 'Historique par joueuse' }),
    )
    expect(
      screen.getByRole('option', { name: 'Alice Martin' }),
    ).toBeInTheDocument()
    expect(mocks.history).not.toHaveBeenCalled()
  })

  it('affiche immédiatement U14 puis U13 avec data disponible pendant un background refetch', () => {
    mocks.roster.mockImplementation(({ teamId }) => ({
      isPending: false,
      isFetching: teamId === 'team-b',
      isError: false,
      status: 'success',
      fetchStatus: teamId === 'team-b' ? 'fetching' : 'idle',
      data: teamId === 'team-b' ? [lina] : [alice],
    }))
    const view = render(<TestRoutes initial="/tests/players" />)
    expect(screen.getByRole('option', { name: 'Alice Martin' })).toBeVisible()
    mocks.app.activeTeamId = 'team-b'
    view.rerender(<TestRoutes initial="/tests/players" />)
    expect(screen.getByRole('option', { name: 'Lina Robert' })).toBeVisible()
    expect(screen.getByLabelText('Joueuse')).toBeEnabled()
    expect(
      screen.queryByText('Chargement des joueuses…'),
    ).not.toBeInTheDocument()
    mocks.app.activeTeamId = 'team-a'
    view.rerender(<TestRoutes initial="/tests/players" />)
    expect(screen.getByRole('option', { name: 'Alice Martin' })).toBeVisible()
    expect(screen.getByLabelText('Joueuse')).toBeEnabled()
  })
})

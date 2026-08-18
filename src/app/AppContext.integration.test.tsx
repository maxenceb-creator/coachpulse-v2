import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../query/queryKeys'
import { repositories } from '../repositories/appRepositories'
import type { Role, Season, Team, TeamAccess, User } from '../types/domain'
import { AppContext, useApp } from './AppContext'

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}))

vi.mock('../repositories/appRepositories', () => ({
  repositories: {
    user: vi.fn(),
    roles: vi.fn(),
    access: vi.fn(),
    teams: vi.fn(),
    activeSeason: vi.fn(),
    setSecurityContext: vi.fn(),
  },
}))

const role: Role = {
  roleId: 'coach',
  code: 'COACH_PRINCIPAL',
  label: 'Coach',
  isActive: true,
  defaultPermissions: [],
}
const season: Season = {
  seasonId: 'season-2026',
  name: '2026-2027',
  startDate: new Date('2026-07-01'),
  endDate: new Date('2027-06-30'),
  status: 'ACTIVE',
  isActive: true,
}
const teams: Record<'u13' | 'u14', Team> = {
  u13: {
    teamId: 'team-u13',
    name: 'U13F',
    teamType: 'DEVELOPMENT',
    seasonId: season.seasonId,
    categoryId: 'category-u13',
    status: 'ACTIVE',
  },
  u14: {
    teamId: 'team-u14',
    name: 'U14F',
    teamType: 'DEVELOPMENT',
    seasonId: season.seasonId,
    categoryId: 'category-u14',
    status: 'ACTIVE',
  },
}
const accesses: TeamAccess[] = Object.values(teams).map((team) => ({
  userTeamAccessId: `user-1_${team.teamId}`,
  userId: 'user-1',
  teamId: team.teamId,
  status: 'ACTIVE',
  rolePermissions: {
    coach: { permissions: ['players.read'], medicalAccessLevel: 'NONE' },
  },
}))
const profile: User = {
  userId: 'user-1',
  firstName: 'Test',
  lastName: 'Coach',
  email: 'coach@example.test',
  status: 'ACTIVE',
  roleIds: [role.roleId],
  preferredActiveRoleId: role.roleId,
}

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function ContextProbe() {
  const app = useApp()
  return (
    <>
      <output data-testid="team">{app.activeTeamId}</output>
      <output data-testid="role">{app.activeRoleId}</output>
      <output data-testid="season">{app.season?.seasonId}</output>
      <output data-testid="ready">{String(app.securityContextReady)}</output>
      {app.teams.map((team) => (
        <button key={team.teamId} onClick={() => app.setTeam(team.teamId)}>
          {team.name}
        </button>
      ))}
    </>
  )
}

function TestProvider({
  client,
  children,
}: {
  client: QueryClient
  children: ReactNode
}) {
  return (
    <QueryClientProvider client={client}>
      <AppContext>{children}</AppContext>
    </QueryClientProvider>
  )
}

const rosterKey = (teamId: string) =>
  queryKeys.players.roster(profile.userId, role.roleId, teamId, season.seasonId)

describe('AppContext — résolution de contexte Team obsolète', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(repositories.user).mockResolvedValue(profile)
    vi.mocked(repositories.roles).mockResolvedValue([role])
    vi.mocked(repositories.access).mockResolvedValue(accesses)
    vi.mocked(repositories.activeSeason).mockResolvedValue([season])
  })

  it.each([
    { initial: 'u13' as const, next: 'u14' as const },
    { initial: 'u14' as const, next: 'u13' as const },
  ])(
    'ignore la résolution $initial tardive et conserve le cache $next',
    async ({ initial, next }) => {
      vi.mocked(repositories.teams).mockResolvedValue([
        teams[initial],
        teams[next],
      ])
      const initialResolution = deferred()
      const nextResolution = deferred()
      vi.mocked(repositories.setSecurityContext).mockImplementation(
        (_uid, _roleId, teamId) =>
          teamId === teams[initial].teamId
            ? initialResolution.promise
            : nextResolution.promise,
      )
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      const currentRoster = [{ playerId: `player-${next}` }]
      client.setQueryData(rosterKey(teams[next].teamId), currentRoster)

      render(
        <TestProvider client={client}>
          <ContextProbe />
        </TestProvider>,
      )

      await waitFor(() =>
        expect(repositories.setSecurityContext).toHaveBeenCalledWith(
          profile.userId,
          role.roleId,
          teams[initial].teamId,
          season.seasonId,
        ),
      )
      expect(screen.getByTestId('ready').textContent).toBe('false')

      fireEvent.click(screen.getByRole('button', { name: teams[next].name }))
      expect(screen.getByTestId('team').textContent).toBe(teams[next].teamId)
      expect(client.getQueryData(rosterKey(teams[next].teamId))).toBe(
        currentRoster,
      )

      await act(async () => initialResolution.resolve())

      await waitFor(() =>
        expect(repositories.setSecurityContext).toHaveBeenCalledWith(
          profile.userId,
          role.roleId,
          teams[next].teamId,
          season.seasonId,
        ),
      )
      expect(repositories.setSecurityContext).toHaveBeenCalledTimes(2)
      expect(client.getQueryData(rosterKey(teams[next].teamId))).toBe(
        currentRoster,
      )
      expect(screen.getByTestId('team').textContent).toBe(teams[next].teamId)
      expect(screen.getByTestId('ready').textContent).toBe('false')

      await act(async () => nextResolution.resolve())

      await waitFor(() =>
        expect(screen.getByTestId('ready').textContent).toBe('true'),
      )
      expect(repositories.setSecurityContext).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('team').textContent).toBe(teams[next].teamId)
      expect(screen.getByTestId('role').textContent).toBe(role.roleId)
      expect(screen.getByTestId('season').textContent).toBe(season.seasonId)
      expect(client.getQueryData(rosterKey(teams[next].teamId))).toBe(
        currentRoster,
      )
      expect(
        client.getQueryData<User>(queryKeys.user(profile.userId))
          ?.securityContext,
      ).toEqual({
        activeRoleId: role.roleId,
        activeTeamId: teams[next].teamId,
        activeSeasonId: season.seasonId,
      })
    },
  )
})

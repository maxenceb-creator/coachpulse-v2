import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { repositories } from '../repositories/appRepositories'
import { canAccessTeam } from '../services/permissionsService'
import { selectActiveId } from '../services/contextSelection'
import { keys } from '../hooks/queryKeys'
import type { Role, Season, Team, TeamAccess, User } from '../types/domain'
type V = {
  profile?: User
  roles: Role[]
  accesses: TeamAccess[]
  teams: Team[]
  season?: Season
  activeRoleId?: string
  setRole: (v: string) => void
  activeTeamId?: string
  setTeam: (v: string) => void
  loading: boolean
  error: boolean
}
const C = createContext<V | null>(null)
export function AppContext({ children }: { children: ReactNode }) {
  const { user } = useAuth(),
    client = useQueryClient(),
    uid = user?.uid ?? ''
  const uq = useQuery({
    queryKey: keys.user(uid),
    queryFn: () => repositories.user(uid),
    enabled: !!uid,
  })
  const p = uq.data ?? undefined
  const rq = useQuery({
    queryKey: keys.roles(p?.roleIds ?? []),
    queryFn: () => repositories.roles(p?.roleIds ?? []),
    enabled: !!p,
  })
  const aq = useQuery({
    queryKey: keys.access(uid),
    queryFn: () => repositories.access(uid),
    enabled: !!p,
  })
  const roles = useMemo(
    () => rq.data?.filter((role) => role.isActive) ?? [],
    [rq.data],
  )
  const accesses = useMemo(() => aq.data ?? [], [aq.data])
  const [activeRoleId, setActiveRoleId] = useState<string>(),
    [activeTeamId, setActiveTeamId] = useState<string>()
  useEffect(() => {
    setActiveRoleId(
      selectActiveId(
        roles.map((role) => role.roleId),
        activeRoleId,
        p?.preferredActiveRoleId,
      ),
    )
  }, [roles, p, activeRoleId])
  const teamIds = useMemo(
    () => [
      ...new Set(
        accesses
          .filter(
            (a) =>
              activeRoleId &&
              canAccessTeam(accesses, uid, activeRoleId, a.teamId),
          )
          .map((a) => a.teamId),
      ),
    ],
    [accesses, activeRoleId, uid],
  )
  const tq = useQuery({
    queryKey: keys.teams(uid, activeRoleId ?? ''),
    queryFn: () => repositories.teams(teamIds),
    enabled: !!activeRoleId,
  })
  const teams = useMemo(() => tq.data ?? [], [tq.data])
  useEffect(() => {
    setActiveTeamId(
      selectActiveId(
        teams.map((team) => team.teamId),
        activeTeamId,
      ),
    )
  }, [teams, activeTeamId])
  const sq = useQuery({
    queryKey: keys.season,
    queryFn: repositories.activeSeason,
    select: (s) => s[0],
  })
  const setRole = (v: string) => {
    setActiveRoleId(v)
    setActiveTeamId(undefined)
    void client.removeQueries({ queryKey: ['teams', uid] })
  }
  const queries = [uq, rq, aq, tq, sq]
  return (
    <C.Provider
      value={{
        profile: p,
        roles,
        accesses,
        teams,
        season: sq.data,
        activeRoleId,
        setRole,
        activeTeamId,
        setTeam: setActiveTeamId,
        loading: queries.some((q) => q.isLoading),
        error: queries.some((q) => q.isError),
      }}
    >
      {children}
    </C.Provider>
  )
}
export const useApp = () => {
  const x = useContext(C)
  if (!x) throw Error('AppContext manquant')
  return x
}

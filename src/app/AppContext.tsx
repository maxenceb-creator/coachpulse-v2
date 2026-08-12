import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { repositories } from '../repositories/appRepositories'
import { resolveAccessibleTeamAccesses } from '../services/permissionsService'
import {
  isSecurityContextReady,
  selectActiveId,
} from '../services/contextSelection'
import { securityContextService } from '../services/securityContextService'
import {
  removeProtectedQueriesExcept,
  removeRoleScopedQueries,
  removeTeamScopedQueries,
} from '../query/cacheLifecycle'
import { queryKeys } from '../query/queryKeys'
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
  securityContextReady: boolean
  loading: boolean
  error: boolean
}
const C = createContext<V | null>(null)
export function AppContext({ children }: { children: ReactNode }) {
  const { user } = useAuth(),
    client = useQueryClient(),
    uid = user?.uid ?? ''
  const uq = useQuery({
    queryKey: queryKeys.user(uid),
    queryFn: () => repositories.user(uid),
    enabled: !!uid,
  })
  const p = uq.data ?? undefined
  const rq = useQuery({
    queryKey: queryKeys.roles(uid, p?.roleIds ?? []),
    queryFn: () => repositories.roles(p?.roleIds ?? []),
    enabled: !!p,
  })
  const aq = useQuery({
    queryKey: queryKeys.teamAccess(uid),
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
        p?.securityContext?.activeRoleId ?? p?.preferredActiveRoleId,
      ),
    )
  }, [roles, p, activeRoleId])
  const accessResolution = useMemo(
    () =>
      activeRoleId
        ? resolveAccessibleTeamAccesses(accesses, uid, activeRoleId)
        : { userAccesses: [], activeAccesses: [], roleAccesses: [] },
    [accesses, activeRoleId, uid],
  )
  const teamIds = useMemo(
    () => [...new Set(accessResolution.roleAccesses.map((a) => a.teamId))],
    [accessResolution.roleAccesses],
  )
  const tq = useQuery({
    queryKey: queryKeys.teams(uid, activeRoleId ?? '', teamIds),
    queryFn: () => repositories.teams(teamIds),
    enabled: !!activeRoleId,
  })
  const teams = useMemo(() => tq.data ?? [], [tq.data])
  useEffect(() => {
    if (!import.meta.env.DEV || !activeRoleId || !aq.data) return

    console.debug('[Team access DEV] Résolution des équipes accessibles', {
      activeRoleId,
      retrievedAccesses: accessResolution.userAccesses.map((access) => ({
        teamId: access.teamId,
        status: access.status,
        startDate: access.startDate?.toISOString(),
        endDate: access.endDate?.toISOString(),
        availableRoleIds: Object.keys(access.rolePermissions),
      })),
      activeAfterTemporalFilter: accessResolution.activeAccesses.map(
        ({ teamId }) => teamId,
      ),
      activeAfterRoleFilter: accessResolution.roleAccesses.map(
        ({ teamId }) => teamId,
      ),
      requestedTeamIds: teamIds,
      finalTeams: teams.map(({ teamId, name, status }) => ({
        teamId,
        name,
        status,
      })),
    })
  }, [activeRoleId, aq.data, accessResolution, teamIds, teams])
  useEffect(() => {
    setActiveTeamId(
      selectActiveId(
        teams.map((team) => team.teamId),
        activeTeamId,
        p?.securityContext?.activeTeamId,
      ),
    )
  }, [teams, activeTeamId, p?.securityContext?.activeTeamId])
  const sq = useQuery({
    queryKey: queryKeys.season,
    queryFn: repositories.activeSeason,
    select: (s) => s[0],
  })
  const contextMutation = useMutation({
    mutationFn: (context: {
      activeRoleId: string
      activeTeamId: string
      activeSeasonId: string
    }) =>
      securityContextService.select({
        user: p!,
        roles,
        accesses,
        ...context,
      }),
    onSuccess: (_, context) => {
      if (import.meta.env.DEV) {
        console.debug('[Security context DEV] Contexte vérifié', context)
      }
      client.setQueryData(
        queryKeys.user(uid),
        (current: User | null | undefined) =>
          current ? { ...current, securityContext: context } : current,
      )
      void removeProtectedQueriesExcept(client, {
        uid,
        roleId: context.activeRoleId,
        teamId: context.activeTeamId,
        seasonId: context.activeSeasonId,
      })
    },
  })
  useEffect(() => {
    if (
      p &&
      activeRoleId &&
      activeTeamId &&
      sq.data &&
      !contextMutation.isPending &&
      !contextMutation.isError &&
      (p.securityContext?.activeRoleId !== activeRoleId ||
        p.securityContext?.activeTeamId !== activeTeamId ||
        p.securityContext?.activeSeasonId !== sq.data.seasonId)
    ) {
      contextMutation.mutate({
        activeRoleId,
        activeTeamId,
        activeSeasonId: sq.data.seasonId,
      })
    }
  }, [p, activeRoleId, activeTeamId, sq.data, contextMutation])
  const setRole = (v: string) => {
    if (contextMutation.isError) contextMutation.reset()
    if (activeRoleId) void removeRoleScopedQueries(client, uid, activeRoleId)
    setActiveRoleId(v)
    setActiveTeamId(undefined)
  }
  const setTeam = (v: string) => {
    if (contextMutation.isError) contextMutation.reset()
    if (activeRoleId && activeTeamId)
      void removeTeamScopedQueries(client, uid, activeRoleId, activeTeamId)
    setActiveTeamId(v)
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
        setTeam,
        securityContextReady: isSecurityContextReady(p?.securityContext, {
          activeRoleId,
          activeTeamId,
          activeSeasonId: sq.data?.seasonId,
        }),
        loading: queries.some((q) => q.isLoading),
        error: queries.some((q) => q.isError) || contextMutation.isError,
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

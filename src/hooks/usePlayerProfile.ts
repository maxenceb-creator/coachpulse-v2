import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  playersService,
  type PlayerProfileContext,
} from '../services/playersService'

export type PlayerProfileHookContext = PlayerProfileContext & {
  securityContextReady: boolean
}

const ready = (context: PlayerProfileHookContext) =>
  context.securityContextReady &&
  !!context.userId &&
  !!context.activeRoleId &&
  !!context.teamId &&
  !!context.seasonId

export const usePlayerProfile = (
  context: PlayerProfileHookContext,
  playerId: string,
) => {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.players.profile(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      playerId,
    ),
    queryFn: async () => {
      const startedAt = performance.now()
      const rosterKey = queryKeys.players.roster(
        context.userId,
        context.activeRoleId,
        context.teamId,
        context.seasonId,
      )
      const cache = client.getQueryData(rosterKey) ? 'hit' : 'miss'
      if (import.meta.env.DEV)
        console.debug('[PlayerProfile PERF DEV]', {
          step: 'identity start',
          playerId,
          teamId: context.teamId,
          cache,
        })
      const roster = await client.ensureQueryData({
        queryKey: rosterKey,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const rosterStartedAt = performance.now()
          if (import.meta.env.DEV)
            console.debug('[PlayerRoster PERF DEV]', {
              step: 'Firestore start',
              source: 'player-profile',
              cache: 'miss',
              teamId: context.teamId,
            })
          try {
            const players = await playersService.listScopedPlayers(context)
            if (import.meta.env.DEV)
              console.debug('[PlayerRoster PERF DEV]', {
                step: 'Firestore success',
                source: 'player-profile',
                count: players.length,
                totalMs: performance.now() - rosterStartedAt,
              })
            return players
          } catch (error) {
            if (import.meta.env.DEV)
              console.error('[PlayerRoster PERF DEV]', {
                step: 'Firestore error',
                source: 'player-profile',
                totalMs: performance.now() - rosterStartedAt,
                error,
              })
            throw error
          }
        },
      })
      if (import.meta.env.DEV)
        console.debug('[PlayerProfile PERF DEV]', {
          step: 'scope validation start',
          playerId,
          rosterCount: roster.length,
        })
      const identity = playersService.getProfileIdentity(
        context,
        playerId,
        roster,
      )
      if (import.meta.env.DEV)
        console.debug('[PlayerProfile PERF DEV]', {
          step: 'scope validation end',
          playerId,
          stepMs: performance.now() - startedAt,
        })
      if (import.meta.env.DEV)
        console.debug('[PlayerProfile PERF DEV]', {
          step: 'identity end',
          playerId,
          totalMs: performance.now() - startedAt,
        })
      return identity
    },
    enabled: ready(context) && !!playerId,
    staleTime: 5 * 60 * 1000,
  })
}

export const usePlayerProfileTaxonomy = (
  context: PlayerProfileHookContext,
  birthYear?: number,
) =>
  useQuery({
    queryKey: queryKeys.players.taxonomy(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      context.categoryId ?? 'none',
      birthYear ?? 'unknown',
    ),
    queryFn: async () => {
      const startedAt = performance.now()
      if (import.meta.env.DEV)
        console.debug('[PlayerProfile PERF DEV]', {
          step: 'taxonomy start',
          teamId: context.teamId,
          categoryId: context.categoryId,
        })
      try {
        const taxonomy = await playersService.getProfileTaxonomy(
          context,
          birthYear!,
        )
        if (import.meta.env.DEV)
          console.debug('[PlayerProfile PERF DEV]', {
            step: 'taxonomy end',
            totalMs: performance.now() - startedAt,
          })
        return taxonomy
      } catch (error) {
        if (import.meta.env.DEV)
          console.error('[PlayerProfile PERF DEV]', {
            step: 'taxonomy error',
            totalMs: performance.now() - startedAt,
            error,
          })
        throw error
      }
    },
    enabled: ready(context) && !!birthYear,
    staleTime: 5 * 60 * 1000,
  })

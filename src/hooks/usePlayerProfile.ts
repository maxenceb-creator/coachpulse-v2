import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  PlayerProfileError,
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
        console.debug('[PLAYER PROFILE STEP DEV]', {
          step: 'identity start',
          playerId,
          teamId: context.teamId,
          cache,
        })
      const rosterStartedAt = performance.now()
      if (import.meta.env.DEV)
        console.debug('[PLAYER PROFILE STEP DEV]', {
          step: 'roster start',
          teamId: context.teamId,
          cache,
        })
      const roster = await client.ensureQueryData({
        queryKey: rosterKey,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const firestoreStartedAt = performance.now()
          if (import.meta.env.DEV)
            console.debug('[PLAYER PROFILE STEP DEV]', {
              step: 'roster Firestore start',
              source: 'player-profile',
              cache: 'miss',
              teamId: context.teamId,
            })
          try {
            const players = await playersService.listScopedPlayers(context)
            if (import.meta.env.DEV)
              console.debug('[PLAYER PROFILE STEP DEV]', {
                step: 'roster Firestore end',
                source: 'player-profile',
                count: players.length,
                totalMs: performance.now() - firestoreStartedAt,
              })
            return players
          } catch (error) {
            if (import.meta.env.DEV)
              console.error('[PLAYER PROFILE STEP DEV]', {
                step: 'roster Firestore error',
                source: 'player-profile',
                totalMs: performance.now() - firestoreStartedAt,
                errorCode:
                  error instanceof PlayerProfileError ? error.code : undefined,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
              })
            throw error
          }
        },
      })
      if (import.meta.env.DEV)
        console.debug('[PLAYER PROFILE STEP DEV]', {
          step: 'roster end',
          teamId: context.teamId,
          cache,
          rosterCount: roster.length,
          totalMs: performance.now() - rosterStartedAt,
        })
      if (import.meta.env.DEV)
        console.debug('[PLAYER PROFILE STEP DEV]', {
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
        console.debug('[PLAYER PROFILE STEP DEV]', {
          step: 'scope validation end',
          playerId,
          stepMs: performance.now() - startedAt,
        })
      if (import.meta.env.DEV)
        console.debug('[PLAYER PROFILE STEP DEV]', {
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
        console.debug('[PLAYER PROFILE STEP DEV]', {
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
          console.debug('[PLAYER PROFILE STEP DEV]', {
            step: 'taxonomy end',
            totalMs: performance.now() - startedAt,
          })
        return taxonomy
      } catch (error) {
        if (import.meta.env.DEV)
          console.error('[PLAYER PROFILE STEP DEV]', {
            step: 'taxonomy error',
            totalMs: performance.now() - startedAt,
            errorCode:
              error instanceof PlayerProfileError ? error.code : undefined,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          })
        throw error
      }
    },
    enabled: ready(context) && !!birthYear,
    staleTime: 5 * 60 * 1000,
  })

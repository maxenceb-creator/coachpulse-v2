import { useQuery } from '@tanstack/react-query'
import { playersService } from '../services/playersService'
import { queryKeys } from '../query/queryKeys'
export const usePlayerCount = (
  uid?: string,
  t?: string,
  s?: string,
  r?: string,
  securityContextReady = false,
) =>
  useQuery({
    queryKey: queryKeys.players.count(uid ?? '', r ?? '', t ?? '', s ?? ''),
    queryFn: () => playersService.countEffectiveByTeam(t!, s!, r!),
    enabled: !!uid && !!t && !!s && !!r && securityContextReady,
  })

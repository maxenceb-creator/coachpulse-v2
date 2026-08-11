import { useQuery } from '@tanstack/react-query'
import { playersService } from '../services/playersService'
import { keys } from './queryKeys'
export const usePlayerCount = (t?: string, s?: string, r?: string) =>
  useQuery({
    queryKey: keys.count(t ?? '', s ?? '', r ?? ''),
    queryFn: () => playersService.countEffectiveByTeam(t!, s!),
    enabled: !!t && !!s && !!r,
  })

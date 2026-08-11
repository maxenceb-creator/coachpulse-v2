import { useQuery } from '@tanstack/react-query'
import { repositories } from '../repositories/appRepositories'
import { keys } from './queryKeys'
export const usePlayerCount = (t?: string, s?: string, r?: string) =>
  useQuery({
    queryKey: keys.count(t ?? '', s ?? '', r ?? ''),
    queryFn: () => repositories.playerCount(t!, s!),
    enabled: !!t && !!s && !!r,
  })

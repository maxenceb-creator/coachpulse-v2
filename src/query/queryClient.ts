import { QueryClient } from '@tanstack/react-query'
import { initializeCacheSchema } from './cacheLifecycle'

export const createAppQueryClient = (storage?: Storage) => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  })
  initializeCacheSchema(client, storage)
  return client
}

import { QueryClient } from '@tanstack/react-query'

/**
 * Configure the QueryClient with optimal settings for the chat application
 */
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus to avoid interrupting user experience
        refetchOnWindowFocus: false,
        // Retry failed requests once before giving up
        retry: 1,
        // Keep data fresh for a reasonable amount of time
        staleTime: 1000 * 60 * 2, // 2 minutes
        // Keep unused data in cache for cleanup
        gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  })
}
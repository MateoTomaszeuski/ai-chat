import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showErrorToast } from '../lib/toast';

/**
 * Hook to set up global error handling for React Query
 * This needs to be used within a component to work properly with React Query's event system
 */
export function useGlobalErrorHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.error) {
        // Only show error for active queries that just failed
        if (event.action?.type === 'failed') {
          showErrorToast(event.query.state.error);
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Also handle mutation errors
  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation.state.error) {
        // Only show error for mutations that just failed
        if (event.action?.type === 'error') {
          showErrorToast(event.mutation.state.error);
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);
}
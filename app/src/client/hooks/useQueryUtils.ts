import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'

/**
 * Custom hook for handling query invalidation and cache management
 */
export function useQueryManagement() {
  const queryClient = useQueryClient()

  const invalidateConversations = () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.conversation.all() 
    })
  }

  const invalidateMessages = (conversationId?: number) => {
    if (conversationId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.message.list(conversationId) 
      })
    } else {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.message.all() 
      })
    }
  }

  const invalidateAllData = () => {
    queryClient.invalidateQueries()
  }

  const clearConversationCache = (conversationId: number) => {
    queryClient.removeQueries({ 
      queryKey: queryKeys.message.list(conversationId) 
    })
    queryClient.removeQueries({
      queryKey: queryKeys.chatSession.session(conversationId)
    })
  }

  const prefetchConversation = (conversationId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.message.list(conversationId),
      queryFn: async () => {
        const { messageApi } = await import('../services/api')
        return messageApi.getByConversation(conversationId)
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
    })
  }

  return {
    invalidateConversations,
    invalidateMessages,
    invalidateAllData,
    clearConversationCache,
    prefetchConversation,
  }
}

/**
 * Hook for handling API errors consistently
 */
export function useErrorHandler() {
  const handleApiError = (error: unknown, context?: string) => {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error)
    
    // Here you could add toast notifications, error reporting, etc.
    // For example:
    // toast.error(`Failed to ${context || 'complete operation'}`)
    
    return error instanceof Error ? error.message : 'An unknown error occurred'
  }

  return { handleApiError }
}
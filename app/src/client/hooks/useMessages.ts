import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messageApi, chatApi } from '../services/api'
import type { ChatMessage } from '../types/chat'
import type { ChatServiceOptions } from '../services/api'
import { queryKeys } from '../lib/queryKeys'

/**
 * Query hook for fetching messages in a conversation
 */
export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.message.list(conversationId) : ['messages', 'empty'],
    queryFn: () => conversationId ? messageApi.getByConversation(conversationId) : [],
    enabled: conversationId !== null,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Mutation hook for sending a message and getting AI response
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (options: ChatServiceOptions) => {
      const { userPrompt, conversationId } = options
      
      // Create user message for immediate UI update
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: userPrompt,
        sender: 'user',
        timestamp: new Date(),
      }

      // Optimistically update the messages cache if we have a conversation ID
      if (conversationId) {
        const queryKey = queryKeys.message.list(conversationId)
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
          old ? [...old, userMessage] : [userMessage]
        )
      }

      // Call the API
      const result = await chatApi.sendMessage(options)
      
      return { result, userMessage, originalConversationId: conversationId }
    },
    onSuccess: ({ result, userMessage, originalConversationId }) => {
      const { aiMessage, conversationId: resultConversationId, titleGenerated } = result
      const finalConversationId = resultConversationId || originalConversationId

      if (finalConversationId) {
        const queryKey = queryKeys.message.list(finalConversationId)
        
        // Update the messages cache
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
          if (originalConversationId) {
            // Existing conversation - add AI message (user message already added optimistically)
            return old ? [...old, aiMessage] : [userMessage, aiMessage]
          } else {
            // New conversation - add both user and AI messages
            return [userMessage, aiMessage]
          }
        })
      }
      
      // If a title was generated or it's a new conversation, invalidate conversations
      if (titleGenerated || !originalConversationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.conversation.all() 
        })
      }
    },
    onError: (error, { conversationId }) => {
      console.error('Failed to send message:', error)
      
      // On error, invalidate the messages to remove optimistic update
      if (conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.message.list(conversationId) 
        })
      }
      
      // Could add toast notification here
    },
  })
}

/**
 * Hook for managing optimistic message updates
 */
export function useOptimisticMessages(conversationId: number | null) {
  const queryClient = useQueryClient()
  
  const addOptimisticMessage = (message: ChatMessage) => {
    if (!conversationId) return
    
    const queryKey = queryKeys.message.list(conversationId)
    queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
      old ? [...old, message] : [message]
    )
  }
  
  const removeOptimisticMessage = (messageId: string) => {
    if (!conversationId) return
    
    const queryKey = queryKeys.message.list(conversationId)
    queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
      old ? old.filter(msg => msg.id !== messageId) : []
    )
  }
  
  return {
    addOptimisticMessage,
    removeOptimisticMessage,
  }
}
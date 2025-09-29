import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '../services/chatService'
import type { ChatServiceOptions } from '../services/chatService'
import type { ChatMessage } from '../types/chat'
import { CONVERSATIONS_QUERY_KEY } from './useConversations'

export const getConversationMessagesQueryKey = (conversationId: number) => 
  ['conversations', conversationId, 'messages']

export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: getConversationMessagesQueryKey(conversationId || 0),
    queryFn: () => conversationId ? chatService.getConversationMessages(conversationId) : [],
    enabled: conversationId !== null,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ messages, userPrompt, conversationId }: ChatServiceOptions) => {
      // Create user message for immediate UI update
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: userPrompt,
        sender: 'user',
        timestamp: new Date(),
      }

      // Optimistically update the messages cache if we have a conversation ID
      if (conversationId) {
        const queryKey = getConversationMessagesQueryKey(conversationId)
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
          old ? [...old, userMessage] : [userMessage]
        )
      }

      // Call the API
      const result = await chatService.getAIResponse({ messages, userPrompt, conversationId })
      
      return { result, userMessage, conversationId }
    },
    onSuccess: ({ result, userMessage, conversationId: originalConversationId }) => {
      if ('errorMessage' in result) {
        // Handle error case
        const finalConversationId = originalConversationId || 1 // fallback
        const queryKey = getConversationMessagesQueryKey(finalConversationId)
        
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
          old ? [...old, result.errorMessage] : [userMessage, result.errorMessage]
        )
      } else {
        // Handle success case
        const { aiMessage, conversationId: resultConversationId, titleGenerated } = result
        const finalConversationId = resultConversationId || originalConversationId || 1
        const queryKey = getConversationMessagesQueryKey(finalConversationId)
        
        // Update the messages cache
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
          if (originalConversationId) {
            // Existing conversation - add AI message
            return old ? [...old, aiMessage] : [userMessage, aiMessage]
          } else {
            // New conversation - add both user and AI messages
            return [userMessage, aiMessage]
          }
        })
        
        // If a title was generated or it's a new conversation, invalidate conversations
        if (titleGenerated || !originalConversationId) {
          queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
        }
      }
    },
    onError: (_, { conversationId }) => {
      // On error, we might want to remove the optimistic update
      if (conversationId) {
        const queryKey = getConversationMessagesQueryKey(conversationId)
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
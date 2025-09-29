import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '../services/chatService'
import type { Conversation } from '../types/chat'

export const CONVERSATIONS_QUERY_KEY = ['conversations']

export function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => chatService.getConversations(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => chatService.createNewConversation(),
    onSuccess: (newConversation) => {
      if (newConversation) {
        // Optimistically update the conversations cache
        queryClient.setQueryData<Conversation[]>(CONVERSATIONS_QUERY_KEY, (old) => 
          old ? [newConversation, ...old] : [newConversation]
        )
      }
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (conversationId: number) => chatService.deleteConversation(conversationId),
    onSuccess: (success, conversationId) => {
      if (success) {
        // Remove the conversation from the cache
        queryClient.setQueryData<Conversation[]>(CONVERSATIONS_QUERY_KEY, (old) =>
          old ? old.filter(conv => conv.id !== conversationId) : []
        )
      }
    },
  })
}
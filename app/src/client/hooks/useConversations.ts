import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationApi } from '../services/api'
import type { Conversation } from '../types/chat'
import { queryKeys } from '../lib/queryKeys'
import { customToast } from '../lib/toast'

/**
 * Query hook for fetching all conversations
 */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversation.lists(),
    queryFn: conversationApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  })
}

/**
 * Mutation hook for creating a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: conversationApi.create,
    onSuccess: (newConversation) => {
      // Optimistically update the conversations cache
      queryClient.setQueryData<Conversation[]>(queryKeys.conversation.lists(), (old) => 
        old ? [newConversation, ...old] : [newConversation]
      )
      // Success feedback is provided by the UI showing the new conversation
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error)
      // Error toast is handled globally
    },
  })
}

/**
 * Mutation hook for deleting a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: conversationApi.delete,
    onSuccess: (_, conversationId) => {
      // Remove the conversation from the cache
      queryClient.setQueryData<Conversation[]>(queryKeys.conversation.lists(), (old) =>
        old ? old.filter(conv => conv.id !== conversationId) : []
      )
      
      // Remove all related message queries
      queryClient.removeQueries({ 
        queryKey: queryKeys.message.list(conversationId) 
      })
      
      // Remove any chat session data
      queryClient.removeQueries({
        queryKey: queryKeys.chatSession.session(conversationId)
      })
      
      // Show success message
      customToast.success('Conversation deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete conversation:', error)
      // Error toast is handled globally
    },
  })
}

/**
 * Hook to get a specific conversation (if we need it later)
 */
export function useConversation(conversationId: number) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: queryKeys.conversation.detail(conversationId),
    queryFn: async () => {
      // This would need a specific API endpoint
      // For now, we can derive it from the conversations list
      const conversations = queryClient.getQueryData<Conversation[]>(queryKeys.conversation.lists())
      return conversations?.find((conv: Conversation) => conv.id === conversationId) || null
    },
    enabled: !!conversationId,
  })
}
export const queryKeys = {
  // Top-level keys
  conversations: ['conversations'] as const,
  messages: ['messages'] as const,
  chat: ['chat'] as const,

  // Conversation-related keys
  conversation: {
    all: () => [...queryKeys.conversations] as const,
    lists: () => [...queryKeys.conversations, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.conversations, 'list', filters] as const,
    details: () => [...queryKeys.conversations, 'detail'] as const,
    detail: (id: number) => [...queryKeys.conversations, 'detail', id] as const,
  },

  // Message-related keys
  message: {
    all: () => [...queryKeys.messages] as const,
    lists: () => [...queryKeys.messages, 'list'] as const,
    list: (conversationId: number, filters?: Record<string, unknown>) =>
      [...queryKeys.messages, 'list', conversationId, filters] as const,
    details: () => [...queryKeys.messages, 'detail'] as const,
    detail: (id: number) => [...queryKeys.messages, 'detail', id] as const,
  },

  // Chat-related keys
  chatSession: {
    all: () => [...queryKeys.chat] as const,
    sessions: () => [...queryKeys.chat, 'session'] as const,
    session: (conversationId: number) => 
      [...queryKeys.chat, 'session', conversationId] as const,
  },
} as const;

// Type helpers for better TypeScript support
export type QueryKeys = typeof queryKeys;
export type ConversationQueryKeys = typeof queryKeys.conversation;
export type MessageQueryKeys = typeof queryKeys.message;
export type ChatQueryKeys = typeof queryKeys.chatSession;
import { createContext, useContext } from "react";
import type { ChatMessage, Conversation } from "../types/chat";

export interface ChatContextType {
  // Message history
  messages: ChatMessage[];
  
  // Conversations
  conversations: Conversation[];
  currentConversationId: number | null;
  
  // AI interaction
  getAIResponse: (userPrompt: string, forceNewConversation?: boolean) => Promise<void>;
  lastUserPrompt: string;
  aiResponse: string;
  
  // State flags
  loading: boolean;
  
  // Conversation management
  loadConversation: (conversationId: number) => void;
  createNewConversation: () => Promise<void>;
  loadConversations: () => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
  
  // Message management
  editMessage: (messageId: number, newContent: string) => Promise<void>;
  
  // Utility functions
  clearMessages: () => void;
}

export const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
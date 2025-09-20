import { createContext, useContext } from "react";
import type { ChatMessage } from "../types/chat";

export interface ChatContextType {
  // Message history
  messages: ChatMessage[];
  
  // AI interaction
  getAIResponse: (userPrompt: string) => Promise<void>;
  lastUserPrompt: string;
  aiResponse: string;
  
  // State flags
  loading: boolean;
  
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
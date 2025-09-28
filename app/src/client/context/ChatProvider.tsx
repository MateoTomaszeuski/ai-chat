import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ChatContext } from "./ChatContext";
import type { ChatMessage, Conversation } from "../types/chat";
import type { ChatContextType } from "./ChatContext";
import { chatService } from "../services/chatService";

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const fetchedConversations = await chatService.getConversations();
      setConversations(fetchedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConversation = await chatService.createNewConversation();
      if (newConversation) {
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        setMessages([]);
        setLastUserPrompt("");
        setAiResponse("");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const loadConversation = async (conversationId: number) => {
    try {
      setLoading(true);
      const conversationMessages = await chatService.getConversationMessages(conversationId);
      setMessages(conversationMessages);
      setCurrentConversationId(conversationId);
      setLastUserPrompt("");
      setAiResponse("");
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAIResponse = async (userPrompt: string): Promise<void> => {
    if (!userPrompt.trim() || loading) return;

    setLoading(true);
    setLastUserPrompt(userPrompt);

    // Create and immediately display user message
    const messageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: messageId,
      content: userPrompt,
      sender: 'user',
      timestamp: new Date(),
    };

    // Immediately add user message to display
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      const result = await chatService.getAIResponse({
        messages,
        userPrompt,
        conversationId: currentConversationId || undefined
      });

      if ('errorMessage' in result) {
        // Handle error case - user message is already displayed
        setAiResponse(result.errorMessage.content);
        setMessages(prevMessages => [...prevMessages, result.errorMessage]);
      } else {
        // Handle successful case - user message is already displayed, just add AI response
        const { aiMessage, conversationId: resultConversationId, titleGenerated } = result;
        setAiResponse(aiMessage.content);
        
        // Update current conversation ID if it was created
        if (!currentConversationId && resultConversationId) {
          setCurrentConversationId(resultConversationId);
        }
        
        // Reload conversations if a title was generated or if it's a new conversation
        // This ensures the sidebar shows the updated title immediately
        if (titleGenerated || (!currentConversationId && resultConversationId)) {
          await loadConversations();
        }
        
        // Add only AI message since user message is already displayed
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }
    } catch (error) {
      const errorText = "Error: Service unavailable";
      setAiResponse(errorText);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        content: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      
      // Log error for debugging
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    try {
      const success = await chatService.deleteConversation(conversationId);
      if (success) {
        // Remove conversation from state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If we're deleting the current conversation, clear the chat
        if (currentConversationId === conversationId) {
          setMessages([]);
          setCurrentConversationId(null);
          setLastUserPrompt("");
          setAiResponse("");
        }
      } else {
        console.error("Failed to delete conversation");
        // Could add a toast notification here in the future
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      // Could add a toast notification here in the future
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setLastUserPrompt("");
    setAiResponse("");
    setCurrentConversationId(null);
  };

  const contextValue: ChatContextType = {
    messages,
    conversations,
    currentConversationId,
    getAIResponse,
    lastUserPrompt,
    aiResponse,
    loading,
    loadConversation,
    createNewConversation,
    loadConversations,
    deleteConversation,
    clearMessages,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}
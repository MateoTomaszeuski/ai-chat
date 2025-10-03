import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { ChatContext } from "./ChatContext";
import type { ChatContextType } from "./ChatContext";
import type { ChatMessage } from "../types/chat";
import { 
  useConversations, 
  useCreateConversation, 
  useDeleteConversation,
  useConversationMessages,
  useSendMessage
} from "../hooks";

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);

  // TanStack Query hooks
  const conversationsQuery = useConversations();
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const conversationMessagesQuery = useConversationMessages(currentConversationId);
  const sendMessageMutation = useSendMessage();

  // Derived state from queries
  const conversations = conversationsQuery.data || [];
  const loading = sendMessageMutation.isPending || conversationMessagesQuery.isLoading;

  const queryMessages = useMemo(() => {
    return conversationMessagesQuery.data || [];
  }, [conversationMessagesQuery.data]);

  // Combine query messages with pending user message for immediate display
  const messages = useMemo(() => {
    const baseMessages = [...queryMessages];
    
    // If we have a pending user message and it's not already in the messages, add it
    if (pendingUserMessage && !baseMessages.some(msg => msg.id === pendingUserMessage.id)) {
      baseMessages.push(pendingUserMessage);
    }
    
    return baseMessages;
  }, [queryMessages, pendingUserMessage]);

  const createNewConversation = async () => {
    try {
      const result = await createConversationMutation.mutateAsync();
      if (result) {
        setCurrentConversationId(result.id);
        setLastUserPrompt("");
        setAiResponse("");
        setPendingUserMessage(null);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const loadConversation = (conversationId: number) => {
    setCurrentConversationId(conversationId);
    setLastUserPrompt("");
    setAiResponse("");
    setPendingUserMessage(null);
  };

  const getAIResponse = async (userPrompt: string, forceNewConversation: boolean = false): Promise<void> => {
    if (!userPrompt.trim() || loading) return;

    setLastUserPrompt(userPrompt);

    // Create user message for immediate display
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: userPrompt,
      sender: 'user',
      timestamp: new Date(),
    };

    // Always show user message immediately when starting a new conversation or if no current conversation
    setPendingUserMessage(userMessage);

    try {
      const result = await sendMessageMutation.mutateAsync({
        messages: queryMessages,
        userPrompt,
        conversationId: forceNewConversation ? undefined : (currentConversationId || undefined)
      });

      // The new API structure returns the response directly
      const { aiMessage, conversationId: resultConversationId } = result.result;
      setAiResponse(aiMessage.content);
      
      // Clear pending message since it's now handled by the query cache
      setPendingUserMessage(null);
      
      // Update current conversation ID if it was created or if we're forcing a new conversation
      if (resultConversationId) {
        console.log('Setting conversation ID to:', resultConversationId, 'forceNew:', forceNewConversation);
        setCurrentConversationId(resultConversationId);
      }
    } catch (error) {
      const errorText = "Error: Service unavailable";
      setAiResponse(errorText);
      setPendingUserMessage(null); // Clear pending message on error
      console.error("Chat error:", error);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      
      // If we're deleting the current conversation, clear the chat
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setLastUserPrompt("");
        setAiResponse("");
        setPendingUserMessage(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const clearMessages = () => {
    setCurrentConversationId(null);
    setLastUserPrompt("");
    setAiResponse("");
    setPendingUserMessage(null);
  };

  const loadConversations = async () => {
    // This is now handled automatically by TanStack Query
    await conversationsQuery.refetch();
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
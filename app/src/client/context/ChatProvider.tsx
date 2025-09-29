import { useState } from "react";
import type { ReactNode } from "react";
import { ChatContext } from "./ChatContext";
import type { ChatContextType } from "./ChatContext";
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

  // TanStack Query hooks
  const conversationsQuery = useConversations();
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const conversationMessagesQuery = useConversationMessages(currentConversationId);
  const sendMessageMutation = useSendMessage();

  // Derived state from queries
  const conversations = conversationsQuery.data || [];
  const messages = conversationMessagesQuery.data || [];
  const loading = sendMessageMutation.isPending || conversationMessagesQuery.isLoading;

  const createNewConversation = async () => {
    try {
      const result = await createConversationMutation.mutateAsync();
      if (result) {
        setCurrentConversationId(result.id);
        setLastUserPrompt("");
        setAiResponse("");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const loadConversation = async (conversationId: number) => {
    setCurrentConversationId(conversationId);
    setLastUserPrompt("");
    setAiResponse("");
  };

  const getAIResponse = async (userPrompt: string): Promise<void> => {
    if (!userPrompt.trim() || loading) return;

    setLastUserPrompt(userPrompt);

    try {
      const result = await sendMessageMutation.mutateAsync({
        messages,
        userPrompt,
        conversationId: currentConversationId || undefined
      });

      if ('errorMessage' in result.result) {
        setAiResponse(result.result.errorMessage.content);
      } else {
        const { aiMessage, conversationId: resultConversationId } = result.result;
        setAiResponse(aiMessage.content);
        
        // Update current conversation ID if it was created
        if (!currentConversationId && resultConversationId) {
          setCurrentConversationId(resultConversationId);
        }
      }
    } catch (error) {
      const errorText = "Error: Service unavailable";
      setAiResponse(errorText);
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
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const clearMessages = () => {
    setCurrentConversationId(null);
    setLastUserPrompt("");
    setAiResponse("");
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
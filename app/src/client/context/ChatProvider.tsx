import { useState } from "react";
import type { ReactNode } from "react";
import { ChatContext } from "./ChatContext";
import type { ChatMessage } from "../types/chat";
import type { ChatContextType } from "./ChatContext";
import { chatService } from "../services/chatService";

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const getAIResponse = async (userPrompt: string): Promise<void> => {
    if (!userPrompt.trim() || loading) return;

    setLoading(true);
    setLastUserPrompt(userPrompt);

    try {
      const result = await chatService.getAIResponse({
        messages,
        userPrompt
      });

      if ('errorMessage' in result) {
        // Handle error case
        setAiResponse(result.errorMessage.content);
        setMessages(prevMessages => [...prevMessages, result.errorMessage]);
      } else {
        // Handle successful case
        const { userMessage, aiMessage } = result;
        setAiResponse(aiMessage.content);
        
        // Add both user and AI messages
        setMessages(prevMessages => [...prevMessages, userMessage, aiMessage]);
      }
    } catch {
      const errorText = "Error: Service unavailable";
      setAiResponse(errorText);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        content: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setLastUserPrompt("");
    setAiResponse("");
  };

  const contextValue: ChatContextType = {
    messages,
    getAIResponse,
    lastUserPrompt,
    aiResponse,
    loading,
    clearMessages,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}
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
        userPrompt
      });

      if ('errorMessage' in result) {
        // Handle error case - user message is already displayed
        setAiResponse(result.errorMessage.content);
        setMessages(prevMessages => [...prevMessages, result.errorMessage]);
      } else {
        // Handle successful case - user message is already displayed, just add AI response
        const { aiMessage } = result;
        setAiResponse(aiMessage.content);
        
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
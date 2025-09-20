import { useState } from "react";
import type { ReactNode } from "react";
import { ChatContext } from "./ChatContext";
import type { ChatMessage } from "../types/chat";
import type { ChatContextType } from "./ChatContext";

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

    // Create user message
    const messageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: messageId,
      content: userPrompt,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      // Convert all messages to OpenAI format including the new user message
      const allMessages = [...messages, userMessage];
      const messagesToSend = allMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponseText = data.response || data.error || "No response received";
        setAiResponse(aiResponseText);

        const aiMessage: ChatMessage = {
          id: Date.now().toString() + "_ai",
          content: aiResponseText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        const errorText = "Error: Failed to get response from server";
        setAiResponse(errorText);
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + "_error",
          content: errorText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
    } catch {
      const errorText = "Error: Unable to connect to server";
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
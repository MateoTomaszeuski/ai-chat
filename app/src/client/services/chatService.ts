import type { ChatMessage } from "../types/chat";

export interface ChatServiceOptions {
  messages: ChatMessage[];
  userPrompt: string;
}

export interface ChatServiceResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

export interface ChatServiceError {
  errorMessage: ChatMessage;
}

export class ChatService {
  async getAIResponse({ messages, userPrompt }: ChatServiceOptions): Promise<ChatServiceResponse | ChatServiceError> {
    if (!userPrompt.trim()) {
      throw new Error("User prompt cannot be empty");
    }

    // Create user message
    const messageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: messageId,
      content: userPrompt,
      sender: 'user',
      timestamp: new Date(),
    };

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

        const aiMessage: ChatMessage = {
          id: Date.now().toString() + "_ai",
          content: aiResponseText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        return { userMessage, aiMessage };
      } else {
        const errorText = "Error: Failed to get response from server";
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + "_error",
          content: errorText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        return { errorMessage };
      }
    } catch {
      const errorText = "Error: Unable to connect to server";
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        content: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      return { errorMessage };
    }
  }
}

// Export a default instance for convenience
export const chatService = new ChatService();
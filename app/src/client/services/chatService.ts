import type { ChatMessage, Conversation } from "../types/chat";
import { getAuthHeadersFromStorage } from "../lib/auth";

export interface ChatServiceOptions {
  messages: ChatMessage[];
  userPrompt: string;
  conversationId?: number;
}

export interface ChatServiceResponse {
  aiMessage: ChatMessage;
  conversationId: number;
  titleGenerated?: boolean;
}

export interface ChatServiceError {
  errorMessage: ChatMessage;
}

export class ChatService {
  async getConversations(): Promise<Conversation[]> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch("/api/conversations", {
        headers
      });
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 401) {
        console.error("Unauthorized: Please log in to access conversations");
      }
      return [];
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  }

  async createNewConversation(): Promise<Conversation | null> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers
      });
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 401) {
        console.error("Unauthorized: Please log in to create a conversation");
      }
      return null;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  }

  async getConversationMessages(conversationId: number): Promise<ChatMessage[]> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers
      });
      if (response.ok) {
        const dbMessages = await response.json();
        return dbMessages.map((msg: { id: number; message_content: string; message_type_id: number; created_at: string }) => ({
          id: msg.id.toString(),
          content: msg.message_content,
          sender: msg.message_type_id === 1 ? 'user' as const : 'ai' as const,
          timestamp: new Date(msg.created_at),
        }));
      }
      if (response.status === 401) {
        console.error("Unauthorized: Please log in to access messages");
      }
      return [];
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return [];
    }
  }

  async deleteConversation(conversationId: number): Promise<boolean> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers
      });
      if (response.status === 401) {
        console.error("Unauthorized: Please log in to delete conversations");
      }
      return response.ok;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return false;
    }
  }

  async getAIResponse({ messages, userPrompt, conversationId }: ChatServiceOptions): Promise<ChatServiceResponse | ChatServiceError> {
    if (!userPrompt.trim()) {
      throw new Error("User prompt cannot be empty");
    }

    // Create user message for API call
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
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

      const headers = getAuthHeadersFromStorage();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          messages: messagesToSend,
          conversationId 
        }),
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
        
        return { 
          aiMessage,
          conversationId: data.conversationId || conversationId || 0,
          titleGenerated: data.titleGenerated || false
        };
      } else if (response.status === 401) {
        const errorText = "Error: Unauthorized. Please log in to chat.";
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + "_error",
          content: errorText,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        return { errorMessage };
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
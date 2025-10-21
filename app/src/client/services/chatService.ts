import type { ChatMessage, Conversation, UserInfo, MessageEdit } from "../types/chat";
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
  async getCurrentUser(): Promise<UserInfo | null> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch("/api/user/me", {
        headers
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  }

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
        
        const messages = dbMessages.map((msg: { id: number; message_content: string; message_type_id: number; created_at: string; is_edited?: boolean }) => {
          return {
            id: msg.id.toString(),
            content: msg.message_content,
            sender: msg.message_type_id === 1 ? 'user' as const : 'ai' as const,
            timestamp: new Date(msg.created_at),
            dbId: msg.id,
            isEdited: msg.is_edited || false,
          };
        });
        
        return messages;
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized: Access denied to this conversation");
      }
      if (response.status === 404) {
        throw new Error("Conversation not found");
      }
      throw new Error(`Failed to fetch messages: ${response.status}`);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      throw error;
    }
  }

  async editMessage(messageId: number, newContent: string): Promise<boolean> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ new_content: newContent }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error editing message:", error);
      return false;
    }
  }

  async getMessageEditHistory(messageId: number): Promise<MessageEdit[]> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch(`/api/messages/${messageId}/history`, {
        headers
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error("Error fetching message edit history:", error);
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

  // Admin: Get all conversations from all users
  async getAllConversationsAdmin(): Promise<Conversation[]> {
    try {
      const headers = getAuthHeadersFromStorage();
      const response = await fetch("/api/admin/conversations", {
        headers
      });
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 403) {
        console.error("Forbidden: Admin access required");
      }
      return [];
    } catch (error) {
      console.error("Error fetching all conversations (admin):", error);
      return [];
    }
  }
}

// Export a default instance for convenience
export const chatService = new ChatService();
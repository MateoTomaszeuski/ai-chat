import type { ChatMessage, Conversation } from "../types/chat";
import { getAuthHeadersFromStorage } from "../lib/auth";
import { availableTools } from "../lib/aiTools";

/**
 * API service functions - pure functions for making HTTP requests
 * These don't contain any React Query logic, just the actual API calls
 */

export interface ChatServiceOptions {
  messages: ChatMessage[];
  userPrompt: string;
  conversationId?: number;
}

export interface ChatServiceResponse {
  aiMessage: ChatMessage;
  conversationId: number;
  titleGenerated?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface ChatServiceError {
  errorMessage: ChatMessage;
}

/**
 * Helper function to handle API responses and provide descriptive error messages
 */
async function handleApiResponse<T>(response: Response, operation: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Failed to ${operation}`;
    
    try {
      // Try to get error details from response body
      const errorData = await response.json();
      if (errorData.error || errorData.message) {
        errorMessage = errorData.error || errorData.message;
      }
    } catch {
      // If we can't parse the error response, use status-based messages
      switch (response.status) {
        case 400:
          errorMessage = `Invalid request: ${operation}`;
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'You don\'t have permission to perform this action';
          break;
        case 404:
          errorMessage = 'The requested resource was not found';
          break;
        case 409:
          errorMessage = 'This action conflicts with the current state';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait a moment before trying again';
          break;
        case 500:
          errorMessage = 'Server error occurred. Please try again later';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable. Please try again later';
          break;
        default:
          errorMessage = `${operation} failed (${response.status})`;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Conversation API functions
export const conversationApi = {
  async getAll(): Promise<Conversation[]> {
    const response = await fetch("/api/conversations", {
      headers: getAuthHeadersFromStorage(),
    });
    return handleApiResponse<Conversation[]>(response, "load conversations");
  },

  async create(): Promise<Conversation> {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: getAuthHeadersFromStorage(),
    });
    return handleApiResponse<Conversation>(response, "create new conversation");
  },

  async delete(conversationId: number): Promise<void> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
      headers: getAuthHeadersFromStorage(),
    });
    await handleApiResponse<void>(response, "delete conversation");
  },
};

interface DbMessage {
  id: number;
  message_content: string;
  message_type_id: number;
  created_at: string;
}

// Message API functions
export const messageApi = {
  async getByConversation(conversationId: number): Promise<ChatMessage[]> {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      headers: getAuthHeadersFromStorage(),
    });
    const dbMessages = await handleApiResponse<DbMessage[]>(response, "load conversation messages");
    
    return dbMessages.map((msg) => ({
      id: msg.id.toString(),
      content: msg.message_content,
      sender: msg.message_type_id === 1 ? 'user' as const : 'ai' as const,
      timestamp: new Date(msg.created_at),
    }));
  },
};

interface ChatApiResponse {
  response?: string;
  error?: string;
  conversationId?: number;
  titleGenerated?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

// Chat API functions
export const chatApi = {
  async sendMessage({ messages, userPrompt, conversationId }: ChatServiceOptions): Promise<ChatServiceResponse> {
    if (!userPrompt.trim()) {
      throw new Error("Message cannot be empty. Please type something before sending.");
    }

    // Create user message for API call
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userPrompt,
      sender: 'user',
      timestamp: new Date(),
    };

    // Convert all messages to OpenAI format including the new user message
    const allMessages = [...messages, userMessage];
    const messagesToSend = allMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: getAuthHeadersFromStorage(),
      body: JSON.stringify({ 
        messages: messagesToSend,
        conversationId,
        tools: availableTools // Send available AI tools to backend
      }),
    });

    const data = await handleApiResponse<ChatApiResponse>(response, "send message to AI");
    
    // Handle AI service errors in the response
    if (data.error) {
      throw new Error(data.error);
    }
    
    const aiResponseText = data.response || "No response received from AI";

    const aiMessage: ChatMessage = {
      id: Date.now().toString() + "_ai",
      content: aiResponseText,
      sender: 'ai',
      timestamp: new Date(),
    };
    
    return { 
      aiMessage,
      conversationId: data.conversationId || conversationId || 0,
      titleGenerated: data.titleGenerated || false,
      toolCalls: data.toolCalls
    };
  },
};

// Legacy service class for backward compatibility (if needed)
export class ChatService {
  async getConversations(): Promise<Conversation[]> {
    try {
      return await conversationApi.getAll();
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  }

  async createNewConversation(): Promise<Conversation | null> {
    try {
      return await conversationApi.create();
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  }

  async getConversationMessages(conversationId: number): Promise<ChatMessage[]> {
    try {
      return await messageApi.getByConversation(conversationId);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return [];
    }
  }

  async deleteConversation(conversationId: number): Promise<boolean> {
    try {
      await conversationApi.delete(conversationId);
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return false;
    }
  }

  async getAIResponse(options: ChatServiceOptions): Promise<ChatServiceResponse | ChatServiceError> {
    try {
      return await chatApi.sendMessage(options);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Error: Unable to connect to server";
      
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

// Export a default instance for backward compatibility
export const chatService = new ChatService();
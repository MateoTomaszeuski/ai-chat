import type { ChatMessage, Conversation } from "../types/chat";

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
}

export interface ChatServiceError {
  errorMessage: ChatMessage;
}

// Conversation API functions
export const conversationApi = {
  async getAll(): Promise<Conversation[]> {
    const response = await fetch("/api/conversations");
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }
    return response.json();
  },

  async create(): Promise<Conversation> {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(conversationId: number): Promise<void> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`);
    }
  },
};

// Message API functions
export const messageApi = {
  async getByConversation(conversationId: number): Promise<ChatMessage[]> {
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    
    const dbMessages = await response.json();
    return dbMessages.map((msg: { 
      id: number; 
      message_content: string; 
      message_type_id: number; 
      created_at: string 
    }) => ({
      id: msg.id.toString(),
      content: msg.message_content,
      sender: msg.message_type_id === 1 ? 'user' as const : 'ai' as const,
      timestamp: new Date(msg.created_at),
    }));
  },
};

// Chat API functions
export const chatApi = {
  async sendMessage({ messages, userPrompt, conversationId }: ChatServiceOptions): Promise<ChatServiceResponse> {
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
      body: JSON.stringify({ 
        messages: messagesToSend,
        conversationId 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

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
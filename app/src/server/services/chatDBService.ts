import { db } from "../server";
import { CreateMessageSchema, CreateUserSchema, type Conversation, type Message, type User } from "../../lib/chatModels";
import { AIService } from "./aiService";

export class ChatDBService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Ensure user exists in database, create if not exists
  async ensureUser(userId: string, email?: string, name?: string): Promise<User> {
    try {
      // Try to get existing user
      let user = await db.oneOrNone<User>(
        'SELECT id, user_id, email, name, created_at, last_login FROM users WHERE user_id = $1',
        [userId]
      );

      if (user) {
        // Update last login
        await db.none(
          'UPDATE users SET last_login = now(), email = COALESCE($2, email), name = COALESCE($3, name) WHERE user_id = $1',
          [userId, email, name]
        );
        
        // Return updated user data
        user = await db.one<User>(
          'SELECT id, user_id, email, name, created_at, last_login FROM users WHERE user_id = $1',
          [userId]
        );
      } else {
        // Create new user
        const userData = CreateUserSchema.parse({
          user_id: userId,
          email,
          name,
        });

        user = await db.one<User>(
          'INSERT INTO users (user_id, email, name) VALUES ($1, $2, $3) RETURNING id, user_id, email, name, created_at, last_login',
          [userData.user_id, userData.email || null, userData.name || null]
        );
      }

      return user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw new Error('Failed to ensure user exists');
    }
  }

  // Create a new conversation
  async createNewConversation(userId: string): Promise<Conversation> {
    try {
      // Create new conversation with a default title (will be updated later)
      const newConversation = await db.one<Conversation>(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, created_at',
        [userId, 'New Chat']
      );

      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get a specific conversation by ID for a specific user
  async getConversationById(conversationId: number, userId: string): Promise<Conversation | null> {
    try {
      const conversation = await db.oneOrNone<Conversation>(
        'SELECT id, user_id, title, created_at FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      return conversation;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  // Get all conversations for a specific user ordered by most recent
  async getAllConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversations = await db.any<Conversation>(
        'SELECT id, user_id, title, created_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return conversations;
    } catch (error) {
      console.error('Error getting all conversations:', error);
      return [];
    }
  }

  // Generate and update conversation title based on first user message
  async generateAndUpdateConversationTitle(conversationId: number, firstUserMessage: string): Promise<void> {
    try {
      // Generate a title using AI - make it very short for sidebar
      const titlePrompt = [
        {
          role: 'user' as const,
          content: `Create a very short title (max 25 characters) for a sidebar chat list. Based on this message: "${firstUserMessage}". Reply only with the title, no quotes.`
        }
      ];

      const titleResponse = await this.aiService.getChatCompletion(titlePrompt);
      let title = titleResponse.response.trim();
      
      // Clean up the title - remove quotes and ensure it's short
      title = title.replace(/['"]/g, '').trim();
      title = title.substring(0, 25) || 'New Chat';
      
      // If title is too generic, create a more specific one
      if (title.toLowerCase() === 'new chat' && firstUserMessage.length > 0) {
        const words = firstUserMessage.split(' ').slice(0, 3);
        title = words.join(' ').substring(0, 25);
      }

      // Update conversation title
      await db.none(
        'UPDATE conversations SET title = $1 WHERE id = $2',
        [title, conversationId]
      );
    } catch (error) {
      console.error('Error generating conversation title:', error);
      // Fallback to a simple title based on first few words
      try {
        const fallbackTitle = firstUserMessage.split(' ').slice(0, 3).join(' ').substring(0, 25) || 'New Chat';
        await db.none(
          'UPDATE conversations SET title = $1 WHERE id = $2',
          [fallbackTitle, conversationId]
        );
      } catch (fallbackError) {
        console.error('Error with fallback title:', fallbackError);
      }
    }
  }

  // Save a message to the database
  async saveMessage(conversationId: number, messageTypeId: number, content: string): Promise<Message> {
    try {
      const messageData = CreateMessageSchema.parse({
        conversation_id: conversationId,
        message_type_id: messageTypeId,
        message_content: content,
      });

      const savedMessage = await db.one<Message>(
        'INSERT INTO messages (conversation_id, message_type_id, message_content) VALUES ($1, $2, $3) RETURNING id, conversation_id, message_type_id, message_content, created_at',
        [messageData.conversation_id, messageData.message_type_id, messageData.message_content]
      );

      return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  // Check if conversation has any messages (to determine if we need to generate title)
  async isFirstMessageInConversation(conversationId: number): Promise<boolean> {
    try {
      const messageCount = await db.one<{ count: string }>(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
        [conversationId]
      );
      return parseInt(messageCount.count) === 0;
    } catch (error) {
      console.error('Error checking first message:', error);
      return false;
    }
  }

  // Get all messages for a conversation (with user ownership verification)
  async getConversationMessages(conversationId: number, userId: string): Promise<Message[]> {
    try {
      // Verify that the conversation belongs to the user before returning messages
      const conversationExists = await db.oneOrNone(
        'SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (!conversationExists) {
        throw new Error('Conversation not found or access denied');
      }

      const messages = await db.any<Message>(
        'SELECT id, conversation_id, message_type_id, message_content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );
      return messages;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  // Delete a conversation and all its messages (with user ownership verification)
  async deleteConversation(conversationId: number, userId: string): Promise<boolean> {
    try {
      // The CASCADE delete in our schema will automatically delete all messages
      // when a conversation is deleted. Only allow deletion if user owns the conversation
      const result = await db.result(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }
}

export const chatDBService = new ChatDBService();
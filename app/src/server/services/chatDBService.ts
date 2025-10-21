import { db } from "../server.js";
import { CreateMessageSchema, CreateUserSchema, type Conversation, type Message, type User } from "../../lib/chatModels.js";
import { AIService } from "./aiService.js";

export class ChatDBService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Ensure user exists in database, create if not exists
  async ensureUser(email: string, name?: string): Promise<User> {
    try {
      if (!email) {
        throw new Error('Email is required to identify user');
      }

      // Try to get existing user
      let user = await db.oneOrNone<User>(
        'SELECT id, email, name, is_admin, created_at, last_login FROM users WHERE email = $1',
        [email]
      );

      if (user) {
        // Update last login and name if provided
        await db.none(
          'UPDATE users SET last_login = now(), name = COALESCE($2, name) WHERE email = $1',
          [email, name]
        );
        
        // Return updated user data
        user = await db.one<User>(
          'SELECT id, email, name, is_admin, created_at, last_login FROM users WHERE email = $1',
          [email]
        );
        
        console.log(`[DB] User ${email} logged in (admin: ${user.is_admin})`);
      } else {
        // Create new user
        const userData = CreateUserSchema.parse({
          email,
          name,
          is_admin: false,
        });

        user = await db.one<User>(
          'INSERT INTO users (email, name, is_admin) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin, created_at, last_login',
          [userData.email, userData.name || null, userData.is_admin]
        );
        
        console.log(`[DB] New user created: ${email}`);
      }

      return user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw new Error('Failed to ensure user exists');
    }
  }

  // Create a new conversation
  async createNewConversation(userEmail: string): Promise<Conversation> {
    try {
      if (!userEmail) {
        throw new Error('User email is required to create conversation');
      }

      // Create new conversation with a default title (will be updated later)
      const newConversation = await db.one<Conversation>(
        'INSERT INTO conversations (user_email, title) VALUES ($1, $2) RETURNING id, user_email, title, created_at',
        [userEmail, 'New Chat']
      );

      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get a specific conversation by ID for a specific user
  async getConversationById(conversationId: number, userEmail: string): Promise<Conversation | null> {
    try {
      if (!userEmail) {
        throw new Error('User email is required');
      }

      const conversation = await db.oneOrNone<Conversation>(
        'SELECT id, user_email, title, created_at FROM conversations WHERE id = $1 AND user_email = $2',
        [conversationId, userEmail]
      );
      return conversation;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  // Get all conversations for a specific user ordered by most recent
  async getAllConversations(userEmail: string): Promise<Conversation[]> {
    try {
      if (!userEmail) {
        throw new Error('User email is required');
      }

      const conversations = await db.any<Conversation>(
        'SELECT id, user_email, title, created_at FROM conversations WHERE user_email = $1 ORDER BY created_at DESC',
        [userEmail]
      );
      
      console.log(`[DB] User ${userEmail} retrieved ${conversations.length} conversations`);
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
  async getConversationMessages(conversationId: number, userEmail: string): Promise<Message[]> {
    try {
      if (!userEmail) {
        throw new Error('User email is required');
      }

      // Verify that the conversation belongs to the user before returning messages
      const conversationExists = await db.oneOrNone(
        'SELECT 1 FROM conversations WHERE id = $1 AND user_email = $2',
        [conversationId, userEmail]
      );

      if (!conversationExists) {
        console.log(`[DB SECURITY] Access denied: User ${userEmail} attempted to access conversation ${conversationId}`);
        throw new Error('Conversation not found or access denied');
      }

      const messages = await db.any<Message>(
        'SELECT id, conversation_id, message_type_id, message_content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );
      
      console.log(`[DB] User ${userEmail} retrieved ${messages.length} messages from conversation ${conversationId}`);
      return messages;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  // Delete a conversation and all its messages (with user ownership verification)
  async deleteConversation(conversationId: number, userEmail: string): Promise<boolean> {
    try {
      if (!userEmail) {
        throw new Error('User email is required');
      }

      // The CASCADE delete in our schema will automatically delete all messages
      // when a conversation is deleted. Only allow deletion if user owns the conversation
      const result = await db.result(
        'DELETE FROM conversations WHERE id = $1 AND user_email = $2',
        [conversationId, userEmail]
      );
      
      const deleted = result.rowCount > 0;
      if (deleted) {
        console.log(`[DB] User ${userEmail} deleted conversation ${conversationId}`);
      } else {
        console.log(`[DB SECURITY] Access denied: User ${userEmail} attempted to delete conversation ${conversationId}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  // Check if user is admin
  async isUserAdmin(userEmail: string): Promise<boolean> {
    try {
      if (!userEmail) {
        return false;
      }

      const user = await db.oneOrNone<{ is_admin: boolean }>(
        'SELECT is_admin FROM users WHERE email = $1',
        [userEmail]
      );

      return user?.is_admin || false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Admin: Get all conversations from all users
  async getAllConversationsForAdmin(): Promise<Array<Conversation & { user_name?: string }>> {
    try {
      const conversations = await db.any<Conversation & { user_name?: string }>(
        `SELECT c.id, c.user_email, c.title, c.created_at, u.name as user_name 
         FROM conversations c 
         LEFT JOIN users u ON c.user_email = u.email 
         ORDER BY c.created_at DESC`
      );
      
      console.log(`[DB ADMIN] Retrieved all ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('Error getting all conversations for admin:', error);
      return [];
    }
  }

  // Admin: Get conversation by ID (without ownership check) - READ ONLY
  async getConversationByIdAdmin(conversationId: number): Promise<Conversation | null> {
    try {
      const conversation = await db.oneOrNone<Conversation>(
        'SELECT id, user_email, title, created_at FROM conversations WHERE id = $1',
        [conversationId]
      );
      
      if (conversation) {
        console.log(`[DB ADMIN] Retrieved conversation ${conversationId} for admin view`);
      }
      
      return conversation;
    } catch (error) {
      console.error('Error getting conversation by ID for admin:', error);
      return null;
    }
  }

  // Admin: Get messages for any conversation (without ownership check) - READ ONLY
  async getConversationMessagesAdmin(conversationId: number): Promise<Message[]> {
    try {
      const messages = await db.any<Message>(
        'SELECT id, conversation_id, message_type_id, message_content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );
      
      console.log(`[DB ADMIN] Retrieved ${messages.length} messages from conversation ${conversationId} for admin view`);
      return messages;
    } catch (error) {
      console.error('Error getting conversation messages for admin:', error);
      throw new Error('Failed to get conversation messages');
    }
  }
}

export const chatDBService = new ChatDBService();
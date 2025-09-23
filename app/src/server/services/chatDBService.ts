import { db } from "../server";
import { CreateMessageSchema, type Conversation, type Message } from "../../lib/chatModels";
import { AIService } from "./aiService";

export class ChatDBService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Get or create a single conversation (since we're using only 1 conversation for now)
  async getOrCreateConversation(): Promise<Conversation> {
    try {
      // Check if there's already a conversation
      const existingConversation = await db.oneOrNone<Conversation>(
        'SELECT id, title, created_at FROM conversations ORDER BY id ASC LIMIT 1'
      );

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation with a default title (will be updated later)
      const newConversation = await db.one<Conversation>(
        'INSERT INTO conversations (title) VALUES ($1) RETURNING id, title, created_at',
        ['New Chat']
      );

      return newConversation;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw new Error('Failed to get or create conversation');
    }
  }

  // Generate and update conversation title based on first user message
  async generateAndUpdateConversationTitle(conversationId: number, firstUserMessage: string): Promise<void> {
    try {
      // Generate a title using AI
      const titlePrompt = [
        {
          role: 'user' as const,
          content: `Generate a short, concise title (max 50 characters) for a conversation that starts with this message: "${firstUserMessage}". Only respond with the title, no quotes or additional text.`
        }
      ];

      const titleResponse = await this.aiService.getChatCompletion(titlePrompt);
      const title = titleResponse.response.trim().substring(0, 50) || 'New Chat';

      // Update conversation title
      await db.none(
        'UPDATE conversations SET title = $1 WHERE id = $2',
        [title, conversationId]
      );
    } catch (error) {
      console.error('Error generating conversation title:', error);
      // Don't throw here, as this is not critical - the conversation still works with default title
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

  // Get all messages for a conversation
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    try {
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
}

export const chatDBService = new ChatDBService();
import "dotenv/config";
import express from "express";
import cors from "cors";
import pgPromise from "pg-promise";
import { readFile } from "node:fs/promises";
import { AIService, ChatRequest } from "./services/aiService.js";
import { chatDBService } from "./services/chatDBService.js";
import { authService, requireAuth } from "./middleware/auth.js";
import { getAuthConfig } from "./config/auth.js";

const pgp = pgPromise({});
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
export const db = pgp(connectionString);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize authentication service
try {
  const authConfig = getAuthConfig();
  authService.initialize(authConfig);
  console.log('Authentication service initialized successfully');
} catch (error) {
  console.warn('Authentication service initialization failed:', error);
  console.warn('Running without authentication - all endpoints will be unprotected');
}

// Initialize AI Service
const aiService = new AIService();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Get current user info (including admin status)
app.get("/api/user/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    const user = await chatDBService.ensureUser(req.user.email, req.user.name);
    res.json({
      email: user.email,
      name: user.name,
      is_admin: user.is_admin
    });
  } catch (err) {
    next(err);
  }
});

// Get all conversations
app.get("/api/conversations", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Ensure user exists in database
    await chatDBService.ensureUser(req.user.email, req.user.name);
    
    const conversations = await chatDBService.getAllConversations(req.user.email);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Admin: Get all conversations from all users
app.get("/api/admin/conversations", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const conversations = await chatDBService.getAllConversationsForAdmin();
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Create new conversation
app.post("/api/conversations", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin - admins cannot create conversations (read-only access)
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admins have read-only access and cannot create conversations' });
    }

    // Ensure user exists in database
    await chatDBService.ensureUser(req.user.email, req.user.name);
    
    const conversation = await chatDBService.createNewConversation(req.user.email);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Get messages for a specific conversation
app.get("/api/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }
    
    // Check if user is admin
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    
    let messages;
    if (isAdmin) {
      // Admins can view any conversation (read-only)
      messages = await chatDBService.getConversationMessagesAdmin(conversationId);
    } else {
      // Regular users can only view their own conversations
      messages = await chatDBService.getConversationMessages(conversationId, req.user.email);
    }
    
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// Delete a specific conversation
app.delete("/api/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin - admins cannot delete conversations (read-only access)
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admins have read-only access and cannot delete conversations' });
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }
    
    const deleted = await chatDBService.deleteConversation(conversationId, req.user.email);
    if (deleted) {
      res.json({ success: true, message: "Conversation deleted successfully" });
    } else {
      res.status(404).json({ error: "Conversation not found" });
    }
  } catch (err) {
    next(err);
  }
});

// Edit a message
app.put("/api/messages/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin - admins cannot edit messages (read-only access)
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admins have read-only access and cannot edit messages' });
    }

    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const { new_content } = req.body;
    if (!new_content || typeof new_content !== 'string' || new_content.trim().length === 0) {
      return res.status(400).json({ error: "new_content is required and must be a non-empty string" });
    }

    const updatedMessage = await chatDBService.editMessage(messageId, new_content, req.user.email);
    res.json(updatedMessage);
  } catch (err) {
    next(err);
  }
});

// Get edit history for a message
app.get("/api/messages/:id/history", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const editHistory = await chatDBService.getMessageEditHistory(messageId, req.user.email);
    res.json(editHistory);
  } catch (err) {
    next(err);
  }
});

app.post("/api/chat", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin - admins cannot send messages (read-only access)
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admins have read-only access and cannot send messages' });
    }

    // Ensure user exists in database
    await chatDBService.ensureUser(req.user.email, req.user.name);

    const parsed = ChatRequest.parse(req.body);
    const messages = parsed.messages;
    const conversationId = req.body.conversationId;
    const tools = req.body.tools;
    
    let conversation;
    
    if (conversationId) {
      // Use existing conversation (with user ownership verification)
      conversation = await chatDBService.getConversationById(conversationId, req.user.email);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found or access denied" });
      }
    } else {
      // Create new conversation
      conversation = await chatDBService.createNewConversation(req.user.email);
    }
    
    // Get the last user message (the new one being sent)
    const lastUserMessage = messages[messages.length - 1];
    let titleGenerated = false;
    
    if (lastUserMessage && lastUserMessage.role === 'user') {
      // Check if this is the first message to generate title
      const isFirstMessage = await chatDBService.isFirstMessageInConversation(conversation.id);
      
      // Save user message to database
      await chatDBService.saveMessage(
        conversation.id, 
        1, // MESSAGE_TYPES.USER
        lastUserMessage.content
      );
      
      // Generate title if this is the first message
      if (isFirstMessage) {
        titleGenerated = true;
        await chatDBService.generateAndUpdateConversationTitle(conversation.id, lastUserMessage.content);
      }
    }

    // Get messages for AI context (handles summarization automatically)
    const contextMessages = await chatDBService.getMessagesForAIContext(conversation.id);
    
    // Convert to AI format
    const aiMessages = contextMessages.map(msg => ({
      role: msg.message_type_id === 1 ? 'user' as const : 'assistant' as const,
      content: msg.message_content,
    }));

    // Check if we need to create a summary
    const tokenCount = aiService.countMessageTokens(aiMessages);
    if (aiService.needsSummarization(tokenCount) && contextMessages.length > 0) {
      console.log(`[SUMMARIZATION] Context has ${tokenCount} tokens, triggering summarization`);
      
      // Generate summary of all current context messages
      const summary = await aiService.generateSummary(aiMessages);
      
      // Get the ID of the last message to be summarized
      const lastMessageId = contextMessages[contextMessages.length - 1].id;
      
      // Save the summary to database
      await chatDBService.saveConversationSummary(
        conversation.id,
        summary,
        lastMessageId
      );
      
      console.log(`[SUMMARIZATION] Summary created for conversation ${conversation.id}`);
      
      // After summarization, get fresh context (will only include new messages after summary)
      const freshContextMessages = await chatDBService.getMessagesForAIContext(conversation.id);
      const freshAiMessages = freshContextMessages.map(msg => ({
        role: msg.message_type_id === 1 ? 'user' as const : 'assistant' as const,
        content: msg.message_content,
      }));
      
      // Prepend the summary as context
      const messagesWithSummary = [
        {
          role: 'system' as const,
          content: `Previous conversation summary: ${summary}`,
        },
        ...freshAiMessages
      ];
      
      // Get AI response with summarized context
      const result = await aiService.getChatCompletion(messagesWithSummary, tools);
      
      // Store the original tool calls to send to frontend
      const executedToolCalls = result.toolCalls;
      
      // Handle tool calls if present
      if (result.toolCalls && result.toolCalls.length > 0) {
        const messagesWithToolCalls: Array<{
          role: 'system' | 'user' | 'assistant' | 'tool';
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: {
              name: string;
              arguments: string;
            };
          }>;
          tool_call_id?: string;
        }> = [
          ...messagesWithSummary,
          {
            role: 'assistant' as const,
            content: result.response || null,
            tool_calls: result.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          }
        ];
        
        for (const toolCall of result.toolCalls) {
          messagesWithToolCalls.push({
            role: 'tool',
            content: JSON.stringify({
              success: true,
              message: `Successfully executed ${toolCall.name}`,
            }),
            tool_call_id: toolCall.id,
          });
        }
        
        const finalResult = await aiService.getChatCompletion(messagesWithToolCalls, tools);
        result.response = finalResult.response;
        result.error = finalResult.error;
      }
      
      // Save AI response to database if successful
      if (result.response && !result.error) {
        await chatDBService.saveMessage(
          conversation.id,
          2, // MESSAGE_TYPES.AI_RESPONSE
          result.response
        );
      }
      
      return res.json({
        response: result.response,
        error: result.error,
        toolCalls: executedToolCalls,
        conversationId: conversation.id,
        titleGenerated
      });
    }
    
    // No summarization needed - proceed normally
    // Get AI response - with tool execution loop
    const result = await aiService.getChatCompletion(aiMessages, tools);
    
    // Store the original tool calls to send to frontend
    const executedToolCalls = result.toolCalls;
    
    // If the AI wants to use tools, execute them and get a final response
    if (result.toolCalls && result.toolCalls.length > 0) {
      // Build messages including the assistant's tool call and tool results
      const messagesWithToolCalls: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | null;
        tool_calls?: Array<{
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        }>;
        tool_call_id?: string;
      }> = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Add assistant message with tool calls
      messagesWithToolCalls.push({
        role: 'assistant',
        content: result.response || null,
        tool_calls: result.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });
      
      // Add tool results as messages
      for (const toolCall of result.toolCalls) {
        messagesWithToolCalls.push({
          role: 'tool',
          content: JSON.stringify({
            success: true,
            message: `Successfully executed ${toolCall.name}`,
          }),
          tool_call_id: toolCall.id,
        });
      }
      
      // Get the final response from the AI after tool execution
      const finalResult = await aiService.getChatCompletion(messagesWithToolCalls, tools);
      
      // Use the final result's text response, but keep the original tool calls
      result.response = finalResult.response;
      result.error = finalResult.error;
      // Keep executedToolCalls to send to frontend for execution
    }
    
    // Save AI response to database if successful
    if (result.response && !result.error) {
      await chatDBService.saveMessage(
        conversation.id,
        2, // MESSAGE_TYPES.AI_RESPONSE
        result.response
      );
    }
    
    res.json({
      response: result.response,
      error: result.error,
      toolCalls: executedToolCalls, // Send the original tool calls to frontend
      conversationId: conversation.id,
      titleGenerated
    });
  } catch (err) {
    next(err);
  }
});

async function ensureSchema() {
  const raw = await readFile("./schema.sql", "utf8");
  if (raw.trim().length === 0) return;
  await db.none(raw); // execute sql, expect no return value
}

async function start() {
  await ensureSchema();
  const port = Number(process.env.PORT) || 4444;
  app.listen(port, "0.0.0.0", () =>
    console.log(`API listening on port ${port}`)
  );
}

start().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});

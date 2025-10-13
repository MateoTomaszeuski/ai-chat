import "dotenv/config";
import express from "express";
import cors from "cors";
import pgPromise from "pg-promise";
import { readFile } from "node:fs/promises";
import { AIService, ChatRequest } from "./services/aiService";
import { chatDBService } from "./services/chatDBService";
import { authService, requireAuth } from "./middleware/auth";
import { getAuthConfig } from "./config/auth";

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
      console.log(`[SECURITY] Non-admin user ${req.user.email} attempted to access admin endpoint`);
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
      console.log(`[SECURITY] Admin ${req.user.email} attempted to create a conversation (read-only access only)`);
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
      console.log(`[ADMIN ACCESS] Admin ${req.user.email} viewed conversation ${conversationId}`);
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
      console.log(`[SECURITY] Admin ${req.user.email} attempted to delete a conversation (read-only access only)`);
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

app.post("/api/chat", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'User not authenticated or email not provided' });
    }

    // Check if user is admin - admins cannot send messages (read-only access)
    const isAdmin = await chatDBService.isUserAdmin(req.user.email);
    if (isAdmin) {
      console.log(`[SECURITY] Admin ${req.user.email} attempted to send a message (read-only access only)`);
      return res.status(403).json({ error: 'Forbidden: Admins have read-only access and cannot send messages' });
    }

    // Ensure user exists in database
    await chatDBService.ensureUser(req.user.email, req.user.name);

    const parsed = ChatRequest.parse(req.body);
    const messages = parsed.messages;
    const conversationId = req.body.conversationId;
    const tools = req.body.tools;
    
    // Log available AI tools sent from frontend
    if (tools && Array.isArray(tools)) {
      console.log(`\n=== AI Tools Available (${tools.length} tools) ===`);
      tools.forEach((tool: { function?: { name?: string; description?: string; parameters?: unknown } }, index: number) => {
        if (tool.function) {
          console.log(`${index + 1}. ${tool.function.name}`);
          console.log(`   Description: ${tool.function.description}`);
          console.log(`   Parameters:`, JSON.stringify(tool.function.parameters, null, 2));
        }
      });
      console.log('=== End Tools List ===\n');
    } else {
      console.log('No AI tools provided in request');
    }
    
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
    
    // Get AI response
    const result = await aiService.getChatCompletion(messages);
    
    // Save AI response to database if successful
    if (result.response && !result.error) {
      await chatDBService.saveMessage(
        conversation.id,
        2, // MESSAGE_TYPES.AI_RESPONSE
        result.response
      );
    }
    
    res.json({
      ...result,
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

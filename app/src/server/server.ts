import "dotenv/config";
import express from "express";
import cors from "cors";
import pgPromise from "pg-promise";
import { readFile } from "node:fs/promises";
import { AIService, ChatRequest } from "./services/aiService";
import { chatDBService } from "./services/chatDBService";

const pgp = pgPromise({});
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
export const db = pgp(connectionString);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI Service
const aiService = new AIService();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Get all conversations
app.get("/api/conversations", async (_req, res, next) => {
  try {
    const conversations = await chatDBService.getAllConversations();
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// Create new conversation
app.post("/api/conversations", async (_req, res, next) => {
  try {
    const conversation = await chatDBService.createNewConversation();
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Get messages for a specific conversation
app.get("/api/conversations/:id/messages", async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }
    
    const messages = await chatDBService.getConversationMessages(conversationId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// Delete a specific conversation
app.delete("/api/conversations/:id", async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }
    
    const deleted = await chatDBService.deleteConversation(conversationId);
    if (deleted) {
      res.json({ success: true, message: "Conversation deleted successfully" });
    } else {
      res.status(404).json({ error: "Conversation not found" });
    }
  } catch (err) {
    next(err);
  }
});

app.post("/api/chat", async (req, res, next) => {
  try {
    const parsed = ChatRequest.parse(req.body);
    const messages = parsed.messages;
    const conversationId = req.body.conversationId;
    
    let conversation;
    
    if (conversationId) {
      // Use existing conversation
      conversation = await chatDBService.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    } else {
      // Create new conversation
      conversation = await chatDBService.createNewConversation();
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

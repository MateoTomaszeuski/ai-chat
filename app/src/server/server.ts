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

app.post("/api/chat", async (req, res, next) => {
  try {
    const parsed = ChatRequest.parse(req.body);
    const messages = parsed.messages;
    
    // Get or create conversation
    const conversation = await chatDBService.getOrCreateConversation();
    
    // Get the last user message (the new one being sent)
    const lastUserMessage = messages[messages.length - 1];
    
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
    
    res.json(result);
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

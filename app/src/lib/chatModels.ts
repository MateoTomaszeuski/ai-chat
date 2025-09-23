import z from "zod";

// Conversation schemas
export const CreateConversationSchema = z.object({
  title: z.string().min(1, "title required").max(200),
});

export const ConversationRowSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  created_at: z.coerce.string(),
});

export type Conversation = z.infer<typeof ConversationRowSchema>;

// Message schemas
export const CreateMessageSchema = z.object({
  conversation_id: z.number().int().positive(),
  message_type_id: z.number().int().min(1).max(3), // 1: User, 2: AI, 3: Summary
  message_content: z.string().min(1, "message content required"),
});

export const MessageRowSchema = z.object({
  id: z.number().int().positive(),
  conversation_id: z.number().int().positive(),
  message_type_id: z.number().int(),
  message_content: z.string(),
  created_at: z.coerce.string(),
});

export type Message = z.infer<typeof MessageRowSchema>;

// Message type constants
export const MESSAGE_TYPES = {
  USER: 1,
  AI_RESPONSE: 2,
  CONVERSATION_SUMMARY: 3,
} as const;
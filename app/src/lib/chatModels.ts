import z from "zod";

// User schemas
export const CreateUserSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().optional(),
  is_admin: z.boolean().optional().default(false),
});

export const UserRowSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  is_admin: z.boolean().default(false),
  created_at: z.coerce.string(),
  last_login: z.coerce.string(),
});

export type User = z.infer<typeof UserRowSchema>;

// Conversation schemas
export const CreateConversationSchema = z.object({
  user_email: z.string().email("Valid email required"),
  title: z.string().min(1, "title required").max(200),
});

export const ConversationRowSchema = z.object({
  id: z.number().int().positive(),
  user_email: z.string().email(),
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
import { z } from "zod";

// OpenAI-compatible API types using zod
const OpenAIChatMessage = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const OpenAIChatCompletionRequest = z.object({
  model: z.string(),
  messages: z.array(OpenAIChatMessage),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
});

const OpenAIChatCompletionResponse = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: OpenAIChatMessage,
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

// Our internal API types (what leaves this service)
export const ChatRequest = z.object({
  messages: z.array(OpenAIChatMessage),
});

export const ChatResponse = z.object({
  response: z.string(),
  error: z.string().optional(),
});

export type ChatRequestType = z.infer<typeof ChatRequest>;
export type ChatResponseType = z.infer<typeof ChatResponse>;

export class AIService {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiBaseUrl = process.env.LLM_API_BASE || "https://ai-snow.reindeer-pinecone.ts.net/api/chat/completions";
    this.model = "gpt-oss-120b";

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is required");
    }
    this.apiKey = process.env.API_KEY;
  }

  async getChatCompletion(messages: z.infer<typeof OpenAIChatMessage>[]): Promise<ChatResponseType> {
    try {
      const requestData = OpenAIChatCompletionRequest.parse({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      const parsedResponse = OpenAIChatCompletionResponse.parse(responseData);

      const aiMessage = parsedResponse.choices[0]?.message?.content;
      if (!aiMessage) {
        throw new Error("No response content from AI API");
      }

      return {
        response: aiMessage,
      };
    } catch (error) {
      console.error("AI Service error:", error);
      return {
        response: "",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
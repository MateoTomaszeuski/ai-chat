import { z } from "zod";

// OpenAI-compatible API types using zod
const OpenAIChatMessage = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().nullable(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
});

const OpenAIChatCompletionRequest = z.object({
  model: z.string(),
  messages: z.array(OpenAIChatMessage),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  tools: z.array(z.any()).optional(),
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
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
  })),
});

export const ChatResponse = z.object({
  response: z.string(),
  error: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
  })).optional(),
});

export type ChatRequestType = z.infer<typeof ChatRequest>;
export type ChatResponseType = z.infer<typeof ChatResponse>;

export class AIService {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly summaryTriggerTokens: number = 100000;

  constructor() {
    this.apiBaseUrl = process.env.LLM_API_BASE || "https://ai-snow.reindeer-pinecone.ts.net/api/chat/completions";
    this.model = "gpt-oss-120b";

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is required");
    }
    this.apiKey = process.env.API_KEY;
  }

  // Approximate token count (rough estimation: ~4 chars per token)
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Count tokens in a message array
  countMessageTokens(messages: z.infer<typeof OpenAIChatMessage>[]): number {
    let totalTokens = 0;
    for (const msg of messages) {
      if (msg.content) {
        totalTokens += this.estimateTokenCount(msg.content);
      }
      if (msg.tool_calls) {
        totalTokens += this.estimateTokenCount(JSON.stringify(msg.tool_calls));
      }
    }
    return totalTokens;
  }

  // Check if context needs summarization
  needsSummarization(tokenCount: number): boolean {
    return tokenCount >= this.summaryTriggerTokens;
  }

  // Generate a summary of messages
  async generateSummary(messages: z.infer<typeof OpenAIChatMessage>[]): Promise<string> {
    try {
      const summaryPrompt: z.infer<typeof OpenAIChatMessage>[] = [
        {
          role: 'system',
          content: 'You are a conversation summarizer. Create a concise but comprehensive summary of the following conversation that preserves all important context, decisions, and information. The summary will be used to maintain context in an ongoing conversation.',
        },
        {
          role: 'user',
          content: `Please summarize the following conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`,
        }
      ];

      const response = await this.getChatCompletion(summaryPrompt);
      return response.response || 'Summary generation failed';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Unable to generate summary';
    }
  }

  async getChatCompletion(
    messages: z.infer<typeof OpenAIChatMessage>[],
    tools?: unknown[]
  ): Promise<ChatResponseType> {
    try {
      const requestData: Record<string, unknown> = {
        model: this.model,
        messages: messages.map(msg => {
          const baseMsg: Record<string, unknown> = {
            role: msg.role,
            content: msg.content,
          };
          
          // Include tool_calls if present
          if (msg.tool_calls) {
            baseMsg.tool_calls = msg.tool_calls;
          }
          
          // Include tool_call_id if present (for tool messages)
          if (msg.tool_call_id) {
            baseMsg.tool_call_id = msg.tool_call_id;
          }
          
          return baseMsg;
        }),
      };

      // Conditionally include tools if provided and non-empty
      if (tools && Array.isArray(tools) && tools.length > 0) {
        requestData.tools = tools;
      }

      const validatedRequest = OpenAIChatCompletionRequest.parse(requestData);

      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(validatedRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      const parsedResponse = OpenAIChatCompletionResponse.parse(responseData);

      const choice = parsedResponse.choices[0];
      if (!choice) {
        throw new Error("No response from AI API");
      }

      const message = choice.message;
      
      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCalls = message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));
        
        return {
          response: message.content || "",
          toolCalls,
        };
      }

      // Normal text response
      if (!message.content) {
        throw new Error("No response content from AI API");
      }

      return {
        response: message.content,
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
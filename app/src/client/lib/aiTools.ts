/**
 * AI Tool Definitions and Handlers
 * 
 * This module defines tools that the AI can use to interact with the application.
 * Tools are defined in OpenAI function calling format and can be executed client-side.
 */

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface ToolContext {
  setBackgroundColor: (color: string) => void;
}

/**
 * Tool: Change Chat Background Color
 * Allows the AI to change the chat container background using Tailwind color classes
 */
export const changeBackgroundColorTool: AITool = {
  type: 'function',
  function: {
    name: 'change_background_color',
    description: 'Change the background color of the chat interface using Tailwind CSS color classes. Available colors: slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose. Shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900. Also: white, black.',
    parameters: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'A Tailwind CSS background color class (e.g., "bg-blue-500", "bg-slate-100", "bg-rose-200"). Use the full class name with "bg-" prefix.',
        },
      },
      required: ['color'],
    },
  },
};

/**
 * All available AI tools
 */
export const availableTools: AITool[] = [
  changeBackgroundColorTool,
];

/**
 * Execute a tool call from the AI
 */
export function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext
): { success: boolean; message: string } {
  switch (toolName) {
    case 'change_background_color': {
      const color = args.color as string;
      if (!color || typeof color !== 'string') {
        return {
          success: false,
          message: 'Invalid color parameter',
        };
      }
      
      // Validate it's a Tailwind bg- class
      if (!color.startsWith('bg-')) {
        return {
          success: false,
          message: 'Color must be a Tailwind background class starting with "bg-"',
        };
      }
      
      context.setBackgroundColor(color);
      return {
        success: true,
        message: `Background color changed to ${color}`,
      };
    }
    
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}

/**
 * Parse AI response text for tool call patterns
 * This is a simple pattern matcher for when the AI wants to use a tool.
 * 
 * Expected format in AI response:
 * ```
 * [TOOL:change_background_color]{"color":"bg-blue-500"}
 * ```
 */
export function parseToolCalls(responseText: string): Array<{
  toolName: string;
  args: Record<string, unknown>;
}> {
  const toolCalls: Array<{ toolName: string; args: Record<string, unknown> }> = [];
  const toolPattern = /\[TOOL:(\w+)\](\{[^}]+\})/g;
  
  let match;
  while ((match = toolPattern.exec(responseText)) !== null) {
    const toolName = match[1];
    try {
      const args = JSON.parse(match[2]);
      toolCalls.push({ toolName, args });
    } catch (error) {
      console.error('Failed to parse tool arguments:', error);
    }
  }
  
  return toolCalls;
}

/**
 * Get tool descriptions to include in system prompt
 */
export function getToolDescriptionsForPrompt(): string {
  return `
You have access to the following tools that you can use to enhance the user experience:

${availableTools.map(tool => `
- ${tool.function.name}: ${tool.function.description}
  Parameters: ${JSON.stringify(tool.function.parameters.properties, null, 2)}
  Required: ${tool.function.parameters.required.join(', ')}
  
  To use this tool, include in your response:
  [TOOL:${tool.function.name}]{"param":"value"}
`).join('\n')}

Important: Tool calls should be on their own line and will be hidden from the user.
`.trim();
}

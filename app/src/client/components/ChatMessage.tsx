import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessage as ChatMessageType } from "../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`message-bubble ${
        message.sender === 'user' ? 'user-message' : 'ai-message'
      }`}
    >
      <div className="message-content">
        {message.sender === 'ai' ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          message.content
        )}
      </div>
      <div className="message-time">
        {message.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  );
}
import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { LoadingMessage } from "./LoadingMessage";
import { useChatBackground } from "../hooks/useMessages";
import type { ChatMessage as ChatMessageType } from "../types/chat";

interface ChatContainerProps {
  messages: ChatMessageType[];
  loading: boolean;
}

export function ChatContainer({ messages, loading }: ChatContainerProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get background color from centralized hook (AI can change this via tool)
  const [backgroundColor] = useChatBackground();
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={`chat-container h-full ${backgroundColor}`}
      ref={chatContainerRef}
    >
      {messages.length === 0 ? (
        <div className="empty-chat">
          Start a conversation by typing a message below
        </div>
      ) : (
        messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
      {loading && <LoadingMessage />}
    </div>
  );
}
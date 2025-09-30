import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { LoadingMessage } from "./LoadingMessage";
import type { ChatMessage as ChatMessageType } from "../types/chat";

interface ChatContainerProps {
  messages: ChatMessageType[];
  loading: boolean;
}

export function ChatContainer({ messages, loading }: ChatContainerProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-container h-full" ref={chatContainerRef}>
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